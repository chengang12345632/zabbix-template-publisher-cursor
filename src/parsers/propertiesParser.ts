import * as fs from 'fs';
import { PropertiesConfig, ZabbixTemplate, TemplateGroup, Application, TemplateDependency, Macro, Item, DiscoveryRule } from '../types/zabbix';

/**
 * Properties文件解析器
 */
export class PropertiesParser {
    
    /**
     * 解析Properties文件
     */
    public static parseFile(filePath: string): PropertiesConfig {
        const content = fs.readFileSync(filePath, 'utf-8');
        return this.parseContent(content);
    }

    /**
     * 解析Properties内容
     */
    public static parseContent(content: string): PropertiesConfig {
        const config: PropertiesConfig = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            
            // 跳过注释和空行
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // 解析键值对
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();
                let value = trimmed.substring(equalIndex + 1).trim();
                
                // 移除引号
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                
                config[key] = value;
            }
        }

        return config;
    }

    /**
     * 将Properties配置转换为Zabbix模板对象
     */
    public static toZabbixTemplate(config: PropertiesConfig): ZabbixTemplate {
        // 先解析监控项和发现规则
        const items = this.parseItems(config);
        const discoveryRules = this.parseDiscoveryRules(config);
        
        // 解析显式定义的应用集
        const explicitApplications = this.parseApplications(config);
        
        // 自动收集所有监控项和发现规则中使用的应用集名称
        const allAppNames = new Set<string>();
        
        // 从监控项中收集
        items.forEach(item => {
            if (item.appName && item.appName.trim()) {
                allAppNames.add(item.appName.trim());
            }
        });
        
        // 从发现规则中收集
        discoveryRules.forEach(rule => {
            if (rule.appName && rule.appName.trim()) {
                allAppNames.add(rule.appName.trim());
            }
        });
        
        // 合并显式定义的应用集和自动收集的应用集
        const mergedApplications: Application[] = [...explicitApplications];
        const existingAppNames = new Set(explicitApplications.map(app => app.name));
        
        // 添加自动收集的应用集（如果不存在）
        const autoCollectedApps: string[] = [];
        allAppNames.forEach(appName => {
            if (!existingAppNames.has(appName)) {
                mergedApplications.push({ name: appName });
                autoCollectedApps.push(appName);
            }
        });
        
        // 调试日志
        if (explicitApplications.length > 0 || autoCollectedApps.length > 0) {
            console.log(`[应用集处理] 模板: ${config['zabbix.template.name']}`);
            console.log(`  - 显式定义的应用集: ${explicitApplications.length}个`, explicitApplications.map(a => a.name));
            console.log(`  - 自动收集的应用集: ${autoCollectedApps.length}个`, autoCollectedApps);
            console.log(`  - 合并后总计: ${mergedApplications.length}个`, mergedApplications.map(a => a.name));
        }
        
        const template: ZabbixTemplate = {
            template: config['zabbix.template'] || '',
            name: config['zabbix.template.name'] || '',
            version: config['zabbix.template.version'] || '5.0',
            groups: this.parseGroups(config),
            applications: mergedApplications,
            templates: this.parseTemplateDependencies(config),
            macros: this.parseMacros(config),
            items: items,
            discoveryRules: discoveryRules
        };

        return template;
    }

    /**
     * 解析模板组
     */
    private static parseGroups(config: PropertiesConfig): TemplateGroup[] {
        const groups: TemplateGroup[] = [];
        let index = 0;

        while (config[`zabbix.groups[${index}].name`]) {
            groups.push({
                name: config[`zabbix.groups[${index}].name`] || ''
            });
            index++;
        }

        return groups;
    }

    /**
     * 解析应用
     */
    private static parseApplications(config: PropertiesConfig): Application[] {
        const applications: Application[] = [];
        let index = 0;

        while (config[`zabbix.applications[${index}].name`]) {
            applications.push({
                name: config[`zabbix.applications[${index}].name`] || ''
            });
            index++;
        }

        return applications;
    }

    /**
     * 解析模板依赖
     */
    private static parseTemplateDependencies(config: PropertiesConfig): TemplateDependency[] | undefined {
        const templates: TemplateDependency[] = [];
        let index = 0;

        while (config[`zabbix.templates[${index}].name`]) {
            templates.push({
                name: config[`zabbix.templates[${index}].name`] || ''
            });
            index++;
        }

        return templates.length > 0 ? templates : undefined;
    }

    /**
     * 解析宏定义
     */
    private static parseMacros(config: PropertiesConfig): Macro[] | undefined {
        const macros: Macro[] = [];
        let index = 0;

        while (config[`zabbix.macros[${index}].macro`]) {
            macros.push({
                macro: config[`zabbix.macros[${index}].macro`] || '',
                value: config[`zabbix.macros[${index}].value`] || '',
                description: config[`zabbix.macros[${index}].description`]
            });
            index++;
        }

        return macros.length > 0 ? macros : undefined;
    }

    /**
     * 解析监控项
     */
    private static parseItems(config: PropertiesConfig): Item[] {
        const items: Item[] = [];
        let index = 0;

        while (config[`zabbix.items[${index}].name`]) {
            items.push({
                name: config[`zabbix.items[${index}].name`] || '',
                key: config[`zabbix.items[${index}].key`] || '',
                type: config[`zabbix.items[${index}].type`] || 'ZABBIX_ACTIVE',
                valueType: config[`zabbix.items[${index}].value_type`] || 'TEXT',
                delay: config[`zabbix.items[${index}].delay`],
                history: config[`zabbix.items[${index}].history`],
                trends: config[`zabbix.items[${index}].trends`],
                masterItem: config[`zabbix.items[${index}].master_item`],
                preprocessingType: config[`zabbix.items[${index}].preprocessing_type`],
                preprocessingParams: config[`zabbix.items[${index}].preprocessing_params`],
                appName: config[`zabbix.items[${index}].appName`] || ''
            });
            index++;
        }

        return items;
    }

    /**
     * 解析发现规则
     */
    private static parseDiscoveryRules(config: PropertiesConfig): DiscoveryRule[] {
        const rules: DiscoveryRule[] = [];
        let index = 0;

        while (config[`zabbix.discovery_rules[${index}].name`]) {
            const rule: DiscoveryRule = {
                name: config[`zabbix.discovery_rules[${index}].name`] || '',
                key: config[`zabbix.discovery_rules[${index}].key`] || '',
                type: config[`zabbix.discovery_rules[${index}].type`] || 'DEPENDENT',
                delay: config[`zabbix.discovery_rules[${index}].delay`],
                lifetime: config[`zabbix.discovery_rules[${index}].lifetime`],
                masterItem: config[`zabbix.discovery_rules[${index}].master_item`],
                preprocessingType: config[`zabbix.discovery_rules[${index}].preprocessing_type`],
                preprocessingParams: config[`zabbix.discovery_rules[${index}].preprocessing_params`],
                lldMacros: config[`zabbix.discovery_rules[${index}].lld_macros`],
                appName: config[`zabbix.discovery_rules[${index}].appName`] || ''
            };

            // 解析item_prototype
            if (config[`zabbix.discovery_rules[${index}].item_prototype.name`]) {
                rule.itemPrototype = {
                    name: config[`zabbix.discovery_rules[${index}].item_prototype.name`] || '',
                    key: config[`zabbix.discovery_rules[${index}].item_prototype.key`] || ''
                };
            }

            rules.push(rule);
            index++;
        }

        return rules;
    }
}

