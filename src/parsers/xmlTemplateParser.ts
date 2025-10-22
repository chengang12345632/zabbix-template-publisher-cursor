import * as xml2js from 'xml2js';
import { ZabbixTemplate } from '../types/zabbix';
import { Logger } from '../utils/logger';

/**
 * XML模板解析器 - 解析Zabbix XML模板文件
 */
export class XmlTemplateParser {
    
    /**
     * 解析XML字符串为Zabbix模板对象
     */
    public static async parseXml(xmlContent: string): Promise<ZabbixTemplate> {
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            trim: true,
            explicitCharkey: false,
            ignoreAttrs: false,
            charkey: '_'
        });

        try {
            const result = await parser.parseStringPromise(xmlContent);
            const zabbixExport = result.zabbix_export;
            
            if (!zabbixExport || !zabbixExport.templates || !zabbixExport.templates.template) {
                throw new Error('无效的Zabbix模板XML格式');
            }

            const xmlTemplate = zabbixExport.templates.template;
            
            // 调试日志 - 显示原始解析结果
            Logger.debug(`XML解析结果 - xmlTemplate keys: ${Object.keys(xmlTemplate).join(', ')}`);
            Logger.debug(`XML解析结果 - discovery_rules: ${JSON.stringify(xmlTemplate.discovery_rules)}`);
            Logger.debug(`XML解析结果 - 完整xmlTemplate: ${JSON.stringify(xmlTemplate, null, 2)}`);
            
            // 转换为标准格式
            const template: ZabbixTemplate = {
                template: xmlTemplate.template || '',
                name: xmlTemplate.name || '',
                version: zabbixExport.version || '5.0',
                groups: this.parseGroups(xmlTemplate.groups),
                applications: this.parseApplications(xmlTemplate.applications),
                templates: this.parseTemplateDependencies(xmlTemplate.templates),
                macros: this.parseMacros(xmlTemplate.macros),
                items: this.parseItems(xmlTemplate.items),
                discoveryRules: this.parseDiscoveryRules(xmlTemplate.discovery_rules)
            };

            Logger.info(`解析后的discoveryRules数量: ${template.discoveryRules.length}`);

            return template;
        } catch (error: any) {
            throw new Error(`解析XML模板失败: ${error.message}`);
        }
    }

    /**
     * 解析模板组
     */
    private static parseGroups(groups: any): any[] {
        if (!groups || !groups.group) {
            return [];
        }
        
        const groupArray = Array.isArray(groups.group) ? groups.group : [groups.group];
        return groupArray.map((g: any) => ({ name: g.name || '' }));
    }

    /**
     * 解析应用分组
     */
    private static parseApplications(applications: any): any[] {
        if (!applications || !applications.application) {
            return [];
        }
        
        const appArray = Array.isArray(applications.application) 
            ? applications.application 
            : [applications.application];
        return appArray.map((app: any) => ({ name: app.name || '' }));
    }

    /**
     * 解析模板依赖
     */
    private static parseTemplateDependencies(templates: any): any[] {
        if (!templates || !templates.template) {
            return [];
        }
        
        const templateArray = Array.isArray(templates.template) 
            ? templates.template 
            : [templates.template];
        return templateArray.map((t: any) => ({ name: t.name || '' }));
    }

    /**
     * 解析宏定义
     */
    private static parseMacros(macros: any): any[] {
        if (!macros || !macros.macro) {
            return [];
        }
        
        const macroArray = Array.isArray(macros.macro) ? macros.macro : [macros.macro];
        return macroArray.map((m: any) => ({
            macro: m.macro || '',
            value: m.value || '',
            description: m.description || ''
        }));
    }

    /**
     * 解析监控项
     */
    private static parseItems(items: any): any[] {
        if (!items || !items.item) {
            return [];
        }
        
        const itemArray = Array.isArray(items.item) ? items.item : [items.item];
        return itemArray.map((item: any) => {
            const appName = this.extractApplicationName(item.applications);
            const masterItemKey = this.extractMasterItemKey(item.master_item);
            const preprocessing = this.extractPreprocessing(item.preprocessing);

            return {
                name: item.name || '',
                key: item.key || '',
                type: item.type || 'DEPENDENT',
                valueType: item.value_type || 'FLOAT',
                delay: item.delay,
                history: item.history,
                trends: item.trends,
                masterItem: masterItemKey,
                preprocessingType: preprocessing.type,
                preprocessingParams: preprocessing.params,
                appName: appName
            };
        });
    }

    /**
     * 解析发现规则
     */
    private static parseDiscoveryRules(discoveryRules: any): any[] {
        Logger.info(`parseDiscoveryRules - 输入: ${JSON.stringify(discoveryRules)}`);
        Logger.info(`parseDiscoveryRules - 类型: ${typeof discoveryRules}`);
        
        if (!discoveryRules) {
            Logger.info('parseDiscoveryRules - discoveryRules为空');
            return [];
        }
        
        // 检查是否有discovery_rule字段
        if (!discoveryRules.discovery_rule) {
            Logger.info('parseDiscoveryRules - 没有discovery_rule字段');
            Logger.info(`discoveryRules的keys: ${Object.keys(discoveryRules).join(', ')}`);
            return [];
        }
        
        Logger.info(`parseDiscoveryRules - discovery_rule: ${JSON.stringify(discoveryRules.discovery_rule)}`);
        
        const ruleArray = Array.isArray(discoveryRules.discovery_rule) 
            ? discoveryRules.discovery_rule 
            : [discoveryRules.discovery_rule];
        
        Logger.info(`parseDiscoveryRules - ruleArray长度: ${ruleArray.length}`);
        
        return ruleArray.map((rule: any) => {
            const masterItemKey = this.extractMasterItemKey(rule.master_item);
            const preprocessing = this.extractPreprocessing(rule.preprocessing);
            const lldMacros = this.extractLldMacros(rule.lld_macro_paths);
            const itemPrototype = this.extractItemPrototype(rule.item_prototypes);
            
            return {
                name: rule.name || '',
                key: rule.key || '',
                type: rule.type || 'DEPENDENT',
                delay: rule.delay,
                lifetime: rule.lifetime,
                description: rule.description || '',
                masterItem: masterItemKey,
                preprocessingType: preprocessing.type,
                preprocessingParams: preprocessing.params,
                lldMacros: lldMacros,
                appName: this.extractApplicationName(rule.applications),
                itemPrototype: itemPrototype
            };
        });
    }

    /**
     * 提取应用名称
     */
    private static extractApplicationName(applications: any): string {
        if (!applications || !applications.application) {
            return '';
        }
        
        const app = Array.isArray(applications.application) 
            ? applications.application[0] 
            : applications.application;
        return app.name || '';
    }

    /**
     * 提取主监控项Key
     */
    private static extractMasterItemKey(masterItem: any): string | undefined {
        if (!masterItem || !masterItem.key) {
            return undefined;
        }
        return masterItem.key;
    }

    /**
     * 提取预处理信息
     */
    private static extractPreprocessing(preprocessing: any): { type?: string, params?: string } {
        if (!preprocessing || !preprocessing.step) {
            return {};
        }
        
        const step = Array.isArray(preprocessing.step) 
            ? preprocessing.step[0] 
            : preprocessing.step;
        
        return {
            type: step.type,
            params: step.params
        };
    }

    /**
     * 提取LLD宏定义
     */
    private static extractLldMacros(lldMacroPaths: any): string {
        if (!lldMacroPaths || !lldMacroPaths.lld_macro_path) {
            return '';
        }
        
        const pathArray = Array.isArray(lldMacroPaths.lld_macro_path) 
            ? lldMacroPaths.lld_macro_path 
            : [lldMacroPaths.lld_macro_path];
        
        const macros = pathArray.map((path: any) => {
            const macro = path.lld_macro || '';
            return macro.replace(/^\{#/, '').replace(/\}$/, '');
        });
        
        return macros.join(',');
    }

    /**
     * 提取监控项原型
     */
    private static extractItemPrototype(itemPrototypes: any): any {
        if (!itemPrototypes || !itemPrototypes.item_prototype) {
            return undefined;
        }
        
        const prototype = Array.isArray(itemPrototypes.item_prototype) 
            ? itemPrototypes.item_prototype[0] 
            : itemPrototypes.item_prototype;
        
        if (!prototype) {
            return undefined;
        }
        
        const preprocessing = this.extractPreprocessing(prototype.preprocessing);
        
        return {
            name: prototype.name || '',
            key: prototype.key || '',
            type: prototype.type || 'DEPENDENT',
            delay: prototype.delay || '0',
            valueType: prototype.value_type || 'FLOAT',
            description: prototype.description || '',
            masterItem: this.extractMasterItemKey(prototype.master_item),
            preprocessing: preprocessing.type ? {
                type: preprocessing.type,
                params: preprocessing.params
            } : undefined,
            appName: this.extractApplicationName(prototype.applications)
        };
    }
}

