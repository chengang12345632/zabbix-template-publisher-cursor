import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PropertiesParser } from './parsers/propertiesParser';
import { XmlConverter } from './converters/xmlConverter';
import { NextCloudClient } from './clients/nextCloudClient';
import { ZabbixClient } from './clients/zabbixClient';
import { PomReader } from './utils/pomReader';
import { Logger } from './utils/logger';
import { PluginConfig, PublishResult } from './types/zabbix';
import { MergedTemplateService } from './services/mergedTemplateService';

// 存储上传文件的URL
interface UploadedFile {
    fileName: string;
    url: string;
    shareUrl?: string; // 公开分享链接
}

let lastUploadedFiles: UploadedFile[] = [];

/**
 * 插件激活入口
 */
export function activate(context: vscode.ExtensionContext) {
    // 初始化日志
    Logger.initialize(context);
    Logger.info('Zabbix Template Publisher 已激活');


    // 注册测试连接命令
    const testConnectionCommand = vscode.commands.registerCommand(
        'zabbix-template-publisher.testConnection',
        async () => {
            await testNextCloudConnection();
        }
    );

    // 注册Dev环境命令 - 生成并测试合并模板
    const devMergeCommand = vscode.commands.registerCommand(
        'zabbix-template-publisher.devMerge',
        async (uri?: vscode.Uri) => {
            await devMergeAndTest(uri);
        }
    );

    // 注册Release环境命令 - 发布到生产环境
    const releaseMergeCommand = vscode.commands.registerCommand(
        'zabbix-template-publisher.releaseMerge',
        async (uri?: vscode.Uri) => {
            await releaseMergeAndPublish(uri);
        }
    );

    context.subscriptions.push(
        testConnectionCommand,
        devMergeCommand,
        releaseMergeCommand
    );
}

/**
 * 插件停用
 */
export function deactivate() {
    Logger.info('Zabbix Template Publisher 已停用');
}

/**
 * 从XML内容中提取模板名称
 */
function extractTemplateNameFromXml(xmlContent: string): string | null {
    try {
        // 使用正则表达式提取模板名称
        const templateNameMatch = xmlContent.match(/<name>([^<]+)<\/name>/);
        if (templateNameMatch && templateNameMatch[1]) {
            return templateNameMatch[1].trim();
        }
        
        // 如果没找到name标签，尝试从文件名或其他地方提取
        const templateMatch = xmlContent.match(/<template[^>]*>[\s\S]*?<name>([^<]+)<\/name>/);
        if (templateMatch && templateMatch[1]) {
            return templateMatch[1].trim();
        }
        
        return null;
    } catch (error) {
        Logger.warn('提取XML模板名称失败:', error);
        return null;
    }
}

/**
 * 测试NextCloud连接
 */
async function testNextCloudConnection(): Promise<void> {
    Logger.clear();
    Logger.separator();
    Logger.info('测试NextCloud连接');
    Logger.separator();

    try {
        // 加载配置
        const config = await loadConfig();
        if (!config) {
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "测试NextCloud连接",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "连接中..." });

            const client = new NextCloudClient(
                config.nextcloud.url,
                config.nextcloud.username,
                config.nextcloud.password,
                config.nextcloud.basePath,
                config.nextcloud.webdavUsername // 传递WebDAV用户名
            );

            Logger.info('测试连接到NextCloud...');
            const isConnected = await client.testConnection();

            if (isConnected) {
                Logger.separator();
                Logger.success('✅ NextCloud连接测试成功！');
                Logger.info('配置信息正确，可以正常发布模板');
                Logger.separator();

                const result = await vscode.window.showInformationMessage(
                    '✅ NextCloud连接测试成功！\n配置信息正确',
                    '查看日志'
                );

                if (result === '查看日志') {
                    Logger.show();
                }
            } else {
                Logger.separator();
                Logger.error('❌ NextCloud连接测试失败');
                Logger.info('请检查以下配置：');
                Logger.info('1. NextCloud URL是否正确');
                Logger.info('2. 用户名是否正确');
                Logger.info('3. 密码是否正确（建议使用应用专用密码）');
                Logger.separator();

                const result = await vscode.window.showErrorMessage(
                    '❌ NextCloud连接测试失败\n请检查配置信息',
                    '查看日志',
                    '打开设置'
                );

                if (result === '查看日志') {
                    Logger.show();
                } else if (result === '打开设置') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'zabbix-template-publisher');
                }
            }
        });
    } catch (error: any) {
        Logger.separator();
        Logger.error('测试连接时发生错误', error);
        Logger.separator();

        const result = await vscode.window.showErrorMessage(
            `测试失败: ${error.message}`,
            '查看日志',
            '打开设置'
        );

        if (result === '查看日志') {
            Logger.show();
        } else if (result === '打开设置') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'zabbix-template-publisher');
        }
    }
}


/**
 * 获取Properties文件路径
 */
async function getPropertiesFilePath(uri?: vscode.Uri): Promise<string | undefined> {
    // 优先使用传入的URI（来自右键菜单）
    if (uri) {
        Logger.debug('从右键菜单获取文件:', uri.fsPath);
        if (uri.fsPath.endsWith('.properties') || uri.fsPath.endsWith('.xml')) {
            return uri.fsPath;
        } else {
            Logger.warn('文件格式不支持:', uri.fsPath);
            vscode.window.showWarningMessage('请选择一个 .properties 或 .xml 文件');
            return undefined;
        }
    }

    // 从当前活动编辑器获取
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const fileName = editor.document.fileName;
        if (fileName.endsWith('.properties') || fileName.endsWith('.xml')) {
            Logger.debug('从活动编辑器获取文件:', fileName);
            return fileName;
        }
    }

    // 最后才让用户选择文件
    Logger.debug('打开文件选择对话框');
    const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
            'Zabbix模板文件': ['properties', 'xml']
        },
        title: '选择Zabbix模板配置文件'
    });

    return files && files.length > 0 ? files[0].fsPath : undefined;
}

/**
 * 查找相关的properties文件（包括master监控项模板）
 */
async function findRelatedPropertiesFiles(businessPropertiesFile: string): Promise<string[]> {
    const files: string[] = [];
    const dir = path.dirname(businessPropertiesFile);
    
    // 如果是XML文件，直接返回该文件，不查找相关文件
    if (businessPropertiesFile.toLowerCase().endsWith('.xml')) {
        Logger.debug('检测到XML文件，跳过查找相关properties文件');
        files.push(businessPropertiesFile);
        return files;
    }
    
    // 规范化路径以便比较（解决Windows路径大小写和反斜杠问题）
    const normalizedBusinessFile = path.normalize(businessPropertiesFile).toLowerCase();
    
    Logger.debug('扫描同级目录，查找主监控项模板...');
    
    try {
        // 读取同级目录下的所有文件
        const dirFiles = fs.readdirSync(dir);
        
        // 查找所有包含master的properties文件
        const masterFiles: string[] = [];
        for (const file of dirFiles) {
            // 必须是properties文件，且文件名包含master
            if (file.endsWith('.properties') && file.toLowerCase().includes('master')) {
                const fullPath = path.join(dir, file);
                const normalizedPath = path.normalize(fullPath).toLowerCase();
                
                // 不要将自己当作master文件（如果业务文件名包含master）
                if (normalizedPath !== normalizedBusinessFile) {
                    masterFiles.push(fullPath);
                    Logger.debug(`  - 发现主监控项模板: ${file}`);
                }
            }
        }
        
        // 先添加所有master文件（主监控项模板应该先导入）
        if (masterFiles.length > 0) {
            files.push(...masterFiles);
            Logger.success(`✓ 找到 ${masterFiles.length} 个主监控项模板，将优先导入`);
        } else {
            Logger.info('未找到主监控项模板（包含master的properties文件）');
        }
    } catch (error: any) {
        Logger.warn(`扫描目录失败: ${error.message}`);
    }
    
    // 最后添加当前业务文件
    files.push(businessPropertiesFile);
    
    return files;
}

/**
 * 加载插件配置
 */
async function loadConfig(): Promise<PluginConfig | undefined> {
    const config = vscode.workspace.getConfiguration('zabbix-template-publisher');

    const nextcloudUrl = config.get<string>('nextcloud.url');
    const nextcloudUsername = config.get<string>('nextcloud.username');
    const nextcloudWebdavUsername = config.get<string>('nextcloud.webdavUsername');
    const nextcloudPassword = config.get<string>('nextcloud.password');

    // 调试日志：显示读取的配置值
    Logger.debug('========================================');
    Logger.debug('从VSCode配置中读取的原始值:');
    Logger.debug(`  - nextcloud.url: ${nextcloudUrl || '(未配置)'}`);
    Logger.debug(`  - nextcloud.username (认证用户名): ${nextcloudUsername || '(未配置)'}`);
    Logger.debug(`  - nextcloud.webdavUsername (WebDAV路径用户名): ${nextcloudWebdavUsername || '(未配置，将使用username)'}`);
    Logger.debug(`  - nextcloud.password: ${nextcloudPassword ? '已配置 (' + nextcloudPassword.substring(0, 5) + '***)' : '(未配置!)'}`);
    Logger.debug(`  - nextcloud.basePath: ${config.get<string>('nextcloud.basePath') || '(未配置，将使用默认值)'}`);
    Logger.debug('========================================');

    if (!nextcloudUrl || !nextcloudUsername || !nextcloudPassword) {
        Logger.error('配置检查失败: 必需的配置项缺失');
        Logger.error(`  - URL配置: ${nextcloudUrl ? '✓' : '✗ 缺失'}`);
        Logger.error(`  - 用户名配置: ${nextcloudUsername ? '✓' : '✗ 缺失'}`);
        Logger.error(`  - 密码配置: ${nextcloudPassword ? '✓' : '✗ 缺失'}`);
        
        const result = await vscode.window.showErrorMessage(
            'NextCloud配置不完整，请先配置插件设置',
            '打开设置'
        );
        
        if (result === '打开设置') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'zabbix-template-publisher');
        }
        
        return undefined;
    }

    const pluginConfig: PluginConfig = {
        nextcloud: {
            url: nextcloudUrl,
            username: nextcloudUsername,
            webdavUsername: nextcloudWebdavUsername || nextcloudUsername, // 如果未配置，使用登录用户名
            password: nextcloudPassword,
            basePath: config.get<string>('nextcloud.basePath') || '/云平台开发部/监控模板'
        }
    };

    // 调试日志：显示最终配置
    Logger.debug('组装后的最终配置对象:');
    Logger.debug(`  - 认证用户名 (username): ${pluginConfig.nextcloud.username}`);
    Logger.debug(`  - WebDAV路径用户名 (webdavUsername): ${pluginConfig.nextcloud.webdavUsername}`);
    Logger.debug(`  - 密码: ${pluginConfig.nextcloud.password ? '已配置 (' + pluginConfig.nextcloud.password.substring(0, 5) + '***)' : '未配置'}`);
    Logger.debug('========================================');

    // Zabbix配置（可选）
    const zabbixUrl = config.get<string>('zabbix.url');
    const zabbixUsername = config.get<string>('zabbix.username');
    const zabbixPassword = config.get<string>('zabbix.password');

    if (zabbixUrl && zabbixUsername && zabbixPassword) {
        pluginConfig.zabbix = {
            url: zabbixUrl,
            username: zabbixUsername,
            password: zabbixPassword
        };
    }

    return pluginConfig;
}

/**
 * 获取版本号
 */
// 此函数已废弃，不再使用版本号配置
async function getVersion(config: PluginConfig, propertiesFile: string): Promise<string> {
    // 从pom.xml读取
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        const pomInfo = await PomReader.readPomInfo(workspaceFolders[0]);
        if (pomInfo.version) {
            return pomInfo.version;
        }
    }

    // 默认版本号
    return '1.0.0';
}

/**
 * 上传到NextCloud
 */
async function uploadToNextCloud(
    xmlFiles: { fileName: string; content: string }[],
    config: PluginConfig,
    version: string
): Promise<UploadedFile[]> {
    const client = new NextCloudClient(
        config.nextcloud.url,
        config.nextcloud.username,
        config.nextcloud.password,
        config.nextcloud.basePath,
        config.nextcloud.webdavUsername // 传递WebDAV用户名
    );

    const uploadedFiles: UploadedFile[] = [];

    for (const xmlFile of xmlFiles) {
        // 创建分享链接（方便分享给他人）
        const urls = await client.uploadToVersionAndAllnew(
            xmlFile.fileName,
            xmlFile.content,
            version,
            true // 启用分享链接生成
        );
        
        // 记录上传的文件URL和分享链接
        uploadedFiles.push({
            fileName: xmlFile.fileName,
            url: urls.allnewUrl, // 使用all_zabbix_template目录的URL
            shareUrl: urls.shareUrl // 公开分享链接
        });

        // 如果有分享链接，记录到日志
        if (urls.shareUrl) {
            Logger.info(`  - 分享链接: ${urls.shareUrl}`);
        }
    }

    return uploadedFiles;
}

/**
 * 导入到Zabbix
 */
async function importToZabbix(
    xmlFiles: { fileName: string; content: string; template: any }[],
    config: PluginConfig
): Promise<boolean> {
    if (!config.zabbix) {
        return false;
    }

    try {
        const client = new ZabbixClient(
            config.zabbix.url,
            config.zabbix.username,
            config.zabbix.password
        );

        // 收集所有需要的主机组
        const allGroups = new Set<string>();
        for (const xmlFile of xmlFiles) {
            if (xmlFile.template.groups && Array.isArray(xmlFile.template.groups)) {
                for (const group of xmlFile.template.groups) {
                    if (group.name) {
                        allGroups.add(group.name);
                    }
                }
            }
        }

        // 确保所有主机组存在
        if (allGroups.size > 0) {
            Logger.separator();
            Logger.debug('检查并创建必需的主机组...');
            await client.ensureHostGroups(Array.from(allGroups));
            Logger.separator();
        }

        // 按顺序导入（主监控项模板优先）
        for (let i = 0; i < xmlFiles.length; i++) {
            const xmlFile = xmlFiles[i];
            Logger.debug(`导入模板到Zabbix: ${xmlFile.template.name}`);
            await client.importTemplate(xmlFile.content, xmlFile.template.name);
            Logger.success(`✓ 导入成功: ${xmlFile.template.name}`);
            
            // 如果不是最后一个模板，添加延迟以确保依赖项生效
            if (i < xmlFiles.length - 1) {
                Logger.debug('等待依赖项生效...');
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
            }
        }

        await client.logout();
        return true;
    } catch (error: any) {
        Logger.error('导入到Zabbix失败', error);
        vscode.window.showWarningMessage(`导入到Zabbix失败: ${error.message}`);
        return false;
    }
}

/**
 * 打开NextCloud文件
 */
function openNextCloudFiles(files: UploadedFile[], config: PluginConfig) {
    if (files.length === 0) {
        vscode.window.showWarningMessage('没有可打开的文件');
        return;
    }

    // 如果只有一个文件，显示选择打开方式
    if (files.length === 1) {
        const file = files[0];
        const options: any[] = [
            {
                label: '📁 打开文件',
                description: '在NextCloud中查看文件',
                url: file.url
            }
        ];
        
        // 如果有分享链接，添加选项
        if (file.shareUrl) {
            options.push({
                label: '🔗 复制分享链接',
                description: '可分享给他人的公开链接',
                url: file.shareUrl,
                isShare: true
            });
        }

        if (options.length === 1) {
            // 只有一个选项，直接打开
            vscode.env.openExternal(vscode.Uri.parse(options[0].url));
            Logger.debug(`在浏览器中打开: ${options[0].url}`);
        } else {
            // 显示选择
            vscode.window.showQuickPick(options, {
                placeHolder: '选择操作'
            }).then(selected => {
                if (selected) {
                    if (selected.isShare) {
                        // 复制分享链接到剪贴板
                        vscode.env.clipboard.writeText(selected.url);
                        vscode.window.showInformationMessage(`✅ 分享链接已复制到剪贴板: ${selected.url}`);
                        Logger.debug(`分享链接已复制: ${selected.url}`);
                    } else {
                        vscode.env.openExternal(vscode.Uri.parse(selected.url));
                        Logger.debug(`在浏览器中打开: ${selected.url}`);
                    }
                }
            });
        }
        return;
    }

    // 多个文件，让用户选择
    vscode.window.showQuickPick(
        files.map(f => ({
            label: f.fileName,
            description: f.shareUrl ? '✅ 有分享链接' : 'NextCloud文件',
            file: f
        })),
        {
            placeHolder: '选择要打开的文件'
        }
    ).then(selected => {
        if (selected) {
            openNextCloudFiles([selected.file], config);
        }
    });
}

/**
 * Dev环境 - 生成并测试合并模板
 */
async function devMergeAndTest(uri?: vscode.Uri): Promise<void> {
    Logger.clear();
    Logger.separator();
    Logger.info('🔧 Dev环境 - 生成并测试合并模板');
    Logger.separator();

    try {
        // 获取Properties文件路径
        const propertiesFile = await getPropertiesFilePath(uri);
        if (!propertiesFile) {
            Logger.error('未选择有效的模板文件');
            vscode.window.showErrorMessage('请选择一个 .properties 文件');
            return;
        }

        // 加载配置
        const config = await loadConfig();
        if (!config) {
            return;
        }

        // 显示进度条
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Dev - 生成并测试合并模板",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "处理中..." });
            await MergedTemplateService.devMergeAndTest(propertiesFile, config);
        });

    } catch (error: any) {
        Logger.separator();
        Logger.error('Dev测试失败', error);
        Logger.separator();

        vscode.window.showErrorMessage(
            `Dev测试失败: ${error.message}`,
            '查看日志'
        ).then(result => {
            if (result === '查看日志') {
                Logger.show();
            }
        });
    }
}

/**
 * Release环境 - 发布到生产环境
 */
async function releaseMergeAndPublish(uri?: vscode.Uri): Promise<void> {
    Logger.clear();
    Logger.separator();
    Logger.info('🚀 Release环境 - 发布到生产环境');
    Logger.separator();

    try {
        // 确认操作
        const confirmed = await vscode.window.showWarningMessage(
            '确定要发布到生产环境吗？\n这将上传模板到Release目录并生成新的合并模板。',
            { modal: true },
            '确定发布'
        );

        if (confirmed !== '确定发布') {
            Logger.info('用户取消发布操作');
            return;
        }

        // 获取Properties文件路径
        const propertiesFile = await getPropertiesFilePath(uri);
        if (!propertiesFile) {
            Logger.error('未选择有效的模板文件');
            vscode.window.showErrorMessage('请选择一个 .properties 文件');
            return;
        }

        // 加载配置
        const config = await loadConfig();
        if (!config) {
            return;
        }

        // 显示进度条
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Release - 发布到生产环境",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "处理中..." });
            await MergedTemplateService.releaseMergeAndPublish(propertiesFile, config);
        });

    } catch (error: any) {
        Logger.separator();
        Logger.error('Release发布失败', error);
        Logger.separator();

        vscode.window.showErrorMessage(
            `Release发布失败: ${error.message}`,
            '查看日志'
        ).then(result => {
            if (result === '查看日志') {
                Logger.show();
            }
        });
    }
}

