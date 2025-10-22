import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PropertiesParser } from '../parsers/propertiesParser';
import { XmlTemplateParser } from '../parsers/xmlTemplateParser';
import { XmlConverter } from '../converters/xmlConverter';
import { TemplateMerger } from './templateMerger';
import { NextCloudClient } from '../clients/nextCloudClient';
import { ZabbixClient } from '../clients/zabbixClient';
import { Logger } from '../utils/logger';
import { PluginConfig, ZabbixTemplate } from '../types/zabbix';

/**
 * 合并模板服务 - 处理Dev和Release环境的模板合并逻辑
 */
export class MergedTemplateService {
    
    /**
     * Dev环境 - 生成并测试合并模板
     * @param propertiesFile 本地properties文件路径
     * @param config 插件配置
     */
    public static async devMergeAndTest(
        propertiesFile: string,
        config: PluginConfig
    ): Promise<void> {
        Logger.separator();
        Logger.info('🔧 Dev环境 - 生成并测试合并模板');
        Logger.separator();

        try {
            // 步骤1: 生成本地模板XML
            Logger.info('步骤1: 生成本地模板XML');
            const localTemplate = await this.generateLocalTemplate(propertiesFile);
            Logger.success(`✓ 本地模板生成完成: ${localTemplate.name}`);

            // 步骤2: 从NextCloud拉取Release模板
            Logger.info('步骤2: 从NextCloud拉取Release模板');
            const releaseTemplates = await this.fetchReleaseTemplates(config);
            
            if (releaseTemplates.length === 0) {
                Logger.warn('⚠️ 没有找到Release模板，将只使用本地模板');
                Logger.info('提示：首次使用时，可以先用传统方式发布模板到NextCloud');
            } else {
                Logger.success(`✓ 拉取了 ${releaseTemplates.length} 个Release模板`);
            }

            // 步骤3: 合并模板（本地模板优先）
            Logger.info('步骤3: 合并模板');
            
            // 去重：如果本地模板和Release模板同名，使用本地模板
            const filteredReleaseTemplates = releaseTemplates.filter(rt => {
                const isDuplicate = rt.template === localTemplate.template || rt.name === localTemplate.name;
                if (isDuplicate) {
                    Logger.info(`检测到重复模板: ${rt.name}，使用本地版本`);
                }
                return !isDuplicate;
            });
            
            if (filteredReleaseTemplates.length < releaseTemplates.length) {
                Logger.info(`去重后: ${releaseTemplates.length} → ${filteredReleaseTemplates.length} 个Release模板`);
            }
            
            const allTemplates = releaseTemplates.length > 0 
                ? [...filteredReleaseTemplates, localTemplate] 
                : [localTemplate];
            
            Logger.info(`准备合并 ${allTemplates.length} 个模板`);
            
            const mergedTemplate = TemplateMerger.mergeTemplates(
                allTemplates,
                'merged_business_template_dev'
            );
            Logger.success('✓ 模板合并完成');

            // 步骤4: 生成合并模板XML
            Logger.info('步骤4: 生成合并模板XML');
            const mergedXml = XmlConverter.toXml(mergedTemplate);
            Logger.success(`✓ 生成XML完成 (${mergedXml.length} bytes)`);

            // 步骤5: 导入到测试Zabbix环境
            if (config.zabbix) {
                Logger.info('步骤5: 导入到测试Zabbix环境');
                await this.importToTestZabbix(mergedXml, mergedTemplate, config);
                Logger.success('✓ 已导入到测试Zabbix环境');
            } else {
                Logger.warn('未配置测试Zabbix环境，跳过导入步骤');
            }

            Logger.separator();
            Logger.success('🎉 Dev测试完成！');
            if (releaseTemplates.length === 0) {
                Logger.info('提示：当前只测试了本地模板');
                Logger.info('如需完整测试，请先使用传统方式发布模板到NextCloud');
            } else {
                Logger.info('如果验证通过，请使用 "Release - 发布到生产环境" 命令发布');
            }
            Logger.separator();

            const message = releaseTemplates.length === 0
                ? '✅ Dev测试完成！\n(当前只使用了本地模板)'
                : '✅ Dev测试完成！模板已导入到测试Zabbix环境';

            vscode.window.showInformationMessage(
                message,
                '查看日志'
            ).then(result => {
                if (result === '查看日志') {
                    Logger.show();
                }
            });

        } catch (error: any) {
            Logger.error('Dev测试失败', error);
            throw error;
        }
    }

    /**
     * Release环境 - 发布到生产环境
     * @param propertiesFile 本地properties文件路径
     * @param config 插件配置
     */
    public static async releaseMergeAndPublish(
        propertiesFile: string,
        config: PluginConfig
    ): Promise<void> {
        Logger.separator();
        Logger.info('🚀 Release环境 - 发布到生产环境');
        Logger.separator();

        try {
            // 步骤1: 生成本地模板XML
            Logger.info('步骤1: 生成本地模板XML');
            const localTemplate = await this.generateLocalTemplate(propertiesFile);
            const localXml = XmlConverter.toXml(localTemplate);
            Logger.success(`✓ 本地模板生成完成: ${localTemplate.name}`);

            // 步骤2: 上传本地模板到Release目录
            Logger.info('步骤2: 上传本地模板到NextCloud Release目录');
            await this.uploadToRelease(localTemplate.template + '.xml', localXml, config);
            Logger.success('✓ 本地模板已上传到Release环境');

            // 步骤3: 从NextCloud拉取所有Release模板（包括刚上传的）
            Logger.info('步骤3: 从NextCloud拉取所有Release模板');
            const releaseTemplates = await this.fetchReleaseTemplates(config);
            
            if (releaseTemplates.length === 0) {
                Logger.error('❌ 无法找到任何Release模板');
                Logger.error('可能的原因：');
                Logger.error('  1. 文件刚上传，WebDAV缓存未更新');
                Logger.error('  2. listFiles解析响应失败');
                Logger.error('建议：稍后重试或手动检查NextCloud目录');
                throw new Error('无法找到Release模板，请稍后重试');
            }
            
            Logger.success(`✓ 拉取了 ${releaseTemplates.length} 个Release模板`);

            // 步骤4: 合并所有Release模板
            Logger.info('步骤4: 合并所有Release模板');
            Logger.info(`准备合并 ${releaseTemplates.length} 个模板`);
            
            const mergedTemplate = TemplateMerger.mergeTemplates(
                releaseTemplates,
                'merged_business_template'
            );
            Logger.success('✓ 模板合并完成');

            // 步骤5: 生成合并模板XML
            Logger.info('步骤5: 生成合并模板XML');
            const mergedXml = XmlConverter.toXml(mergedTemplate);
            Logger.success(`✓ 生成XML完成 (${mergedXml.length} bytes)`);

            // 步骤6: 上传合并模板到merged目录
            Logger.info('步骤6: 上传合并模板到NextCloud merged目录');
            await this.uploadToMerged('merged_business_template.xml', mergedXml, config);
            Logger.success('✓ 合并模板已上传到merged目录');

            Logger.separator();
            Logger.success('🎉 Release发布完成！');
            Logger.info('合并模板已上传到: zabbix_template_release/merged/');
            Logger.separator();

            vscode.window.showInformationMessage(
                '✅ Release发布完成！合并模板已上传到生产环境',
                '查看日志'
            ).then(result => {
                if (result === '查看日志') {
                    Logger.show();
                }
            });

        } catch (error: any) {
            Logger.error('Release发布失败', error);
            throw error;
        }
    }

    /**
     * 生成本地模板（从properties文件）
     */
    private static async generateLocalTemplate(propertiesFile: string): Promise<ZabbixTemplate> {
        Logger.info(`解析Properties文件: ${path.basename(propertiesFile)}`);
        
        const propertiesConfig = PropertiesParser.parseFile(propertiesFile);
        const template = PropertiesParser.toZabbixTemplate(propertiesConfig);
        
        Logger.success(`✓ 解析成功: ${template.name}`);
        return template;
    }

    /**
     * 从NextCloud拉取Release模板
     */
    private static async fetchReleaseTemplates(config: PluginConfig): Promise<ZabbixTemplate[]> {
        const client = new NextCloudClient(
            config.nextcloud.url,
            config.nextcloud.username,
            config.nextcloud.password,
            config.nextcloud.basePath,
            config.nextcloud.webdavUsername
        );

        const templates: ZabbixTemplate[] = [];
        const releasePath = 'zabbix_template_release';

        Logger.info(`从NextCloud拉取模板: ${releasePath}`);

        try {
            // 列出Release目录下的所有文件
            const files = await this.listFiles(client, releasePath);
            
            if (files.length === 0) {
                Logger.warn('⚠️ NextCloud上没有找到任何Release模板文件');
                Logger.warn('提示：');
                Logger.warn(`  1. 请确认目录存在: ${config.nextcloud.basePath}/${releasePath}`);
                Logger.warn('  2. 请先使用传统方式发布至少一个模板到NextCloud');
                Logger.warn('  3. 或者创建该目录并上传模板文件');
                return [];
            }
            
            Logger.info(`找到 ${files.length} 个XML文件`);

            // 下载并解析每个模板
            for (const file of files) {
                try {
                    Logger.info(`下载模板: ${file}`);
                    const xmlContent = await this.downloadFile(client, releasePath, file);
                    
                    Logger.info(`解析模板: ${file}`);
                    const template = await XmlTemplateParser.parseXml(xmlContent);
                    templates.push(template);
                    
                    Logger.success(`✓ ${file} 解析完成`);
                } catch (error: any) {
                    Logger.warn(`跳过文件 ${file}: ${error.message}`);
                }
            }

        } catch (error: any) {
            // 检查是否是404错误（目录不存在）
            if (error.message && error.message.includes('404')) {
                Logger.error('❌ NextCloud目录不存在', error);
                Logger.error('────────────────────────────────────────');
                Logger.error('解决方案：');
                Logger.error(`1. 请在NextCloud中创建目录: ${config.nextcloud.basePath}/${releasePath}`);
                Logger.error('2. 使用传统发布方式上传至少一个模板到NextCloud');
                Logger.error('3. 或者手动在NextCloud中创建该目录');
                Logger.error('────────────────────────────────────────');
                Logger.error('提示：首次使用合并模板功能前，需要先有Release模板存在');
                throw new Error(`NextCloud目录不存在: ${releasePath}，请先创建该目录或使用传统方式发布模板`);
            }
            
            Logger.error('拉取Release模板失败', error);
            throw new Error(`无法从NextCloud拉取模板: ${error.message}`);
        }

        return templates;
    }

    /**
     * 列出目录下的所有XML文件
     */
    private static async listFiles(client: NextCloudClient, directory: string): Promise<string[]> {
        return await client.listFiles(directory);
    }

    /**
     * 下载文件
     */
    private static async downloadFile(client: NextCloudClient, directory: string, fileName: string): Promise<string> {
        return await client.downloadFile(directory, fileName);
    }

    /**
     * 上传到Release目录
     */
    private static async uploadToRelease(
        fileName: string,
        content: string,
        config: PluginConfig
    ): Promise<void> {
        const client = new NextCloudClient(
            config.nextcloud.url,
            config.nextcloud.username,
            config.nextcloud.password,
            config.nextcloud.basePath,
            config.nextcloud.webdavUsername
        );

        await client.uploadFile(fileName, content, 'zabbix_template_release');
        Logger.success(`✓ ${fileName} 已上传到 zabbix_template_release/`);
    }

    /**
     * 上传到merged目录
     */
    private static async uploadToMerged(
        fileName: string,
        content: string,
        config: PluginConfig
    ): Promise<void> {
        const client = new NextCloudClient(
            config.nextcloud.url,
            config.nextcloud.username,
            config.nextcloud.password,
            config.nextcloud.basePath,
            config.nextcloud.webdavUsername
        );

        await client.uploadFile(fileName, content, 'zabbix_template_release/merged');
        Logger.success(`✓ ${fileName} 已上传到 zabbix_template_release/merged/`);
    }

    /**
     * 导入到测试Zabbix环境
     */
    private static async importToTestZabbix(
        xmlContent: string,
        template: ZabbixTemplate,
        config: PluginConfig
    ): Promise<void> {
        if (!config.zabbix) {
            throw new Error('未配置测试Zabbix环境');
        }

        const client = new ZabbixClient(
            config.zabbix.url,
            config.zabbix.username,
            config.zabbix.password
        );

        // 确保主机组存在
        if (template.groups && template.groups.length > 0) {
            const groupNames = template.groups.map(g => g.name);
            await client.ensureHostGroups(groupNames);
        }

        // 导入模板
        await client.importTemplate(xmlContent, template.name);
        await client.logout();
    }
}

