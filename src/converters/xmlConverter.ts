import { ZabbixTemplate, Item, DiscoveryRule } from '../types/zabbix';

/**
 * XML转换器 - 将Zabbix模板对象转换为XML格式
 */
export class XmlConverter {
    
    /**
     * 将Zabbix模板转换为XML字符串
     */
    public static toXml(template: ZabbixTemplate): string {
        const date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<zabbix_export>\n';
        xml += `    <version>${template.version}</version>\n`;
        xml += `    <date>${date}</date>\n`;
        
        // 模板组
        xml += this.generateGroups(template.groups);
        
        // 模板定义
        xml += '    <templates>\n';
        xml += '        <template>\n';
        xml += `            <template>${this.escapeXml(template.template)}</template>\n`;
        xml += `            <name>${this.escapeXml(template.name)}</name>\n`;
        
        // 模板组引用
        xml += '            <groups>\n';
        for (const group of template.groups) {
            xml += '                <group>\n';
            xml += `                    <name>${this.escapeXml(group.name)}</name>\n`;
            xml += '                </group>\n';
        }
        xml += '            </groups>\n';
        
        // 应用
        if (template.applications && template.applications.length > 0) {
            xml += this.generateApplications(template.applications);
        }
        
        // 模板依赖
        if (template.templates && template.templates.length > 0) {
            xml += this.generateTemplateDependencies(template.templates);
        }
        
        // 宏定义
        if (template.macros && template.macros.length > 0) {
            xml += this.generateMacros(template.macros);
        }
        
        // 监控项
        if (template.items && template.items.length > 0) {
            xml += this.generateItems(template.items);
        }
        
        // 发现规则
        if (template.discoveryRules && template.discoveryRules.length > 0) {
            xml += this.generateDiscoveryRules(template.discoveryRules, template.items[0]?.appName);
        }
        
        xml += '        </template>\n';
        xml += '    </templates>\n';
        xml += '</zabbix_export>\n';
        
        return xml;
    }

    /**
     * 生成模板组XML
     */
    private static generateGroups(groups: any[]): string {
        let xml = '    <groups>\n';
        for (const group of groups) {
            xml += '        <group>\n';
            xml += `            <name>${this.escapeXml(group.name)}</name>\n`;
            xml += '        </group>\n';
        }
        xml += '    </groups>\n';
        return xml;
    }

    /**
     * 生成应用XML
     */
    private static generateApplications(applications: any[]): string {
        let xml = '            <applications>\n';
        for (const app of applications) {
            xml += '                <application>\n';
            xml += `                    <name>${this.escapeXml(app.name)}</name>\n`;
            xml += '                </application>\n';
        }
        xml += '            </applications>\n';
        return xml;
    }

    /**
     * 生成模板依赖XML
     */
    private static generateTemplateDependencies(templates: any[]): string {
        let xml = '            <templates>\n';
        for (const tmpl of templates) {
            xml += '                <template>\n';
            xml += `                    <name>${this.escapeXml(tmpl.name)}</name>\n`;
            xml += '                </template>\n';
        }
        xml += '            </templates>\n';
        return xml;
    }

    /**
     * 生成宏定义XML
     */
    private static generateMacros(macros: any[]): string {
        let xml = '            <macros>\n';
        for (const macro of macros) {
            xml += '                <macro>\n';
            xml += `                    <macro>${this.escapeXml(macro.macro)}</macro>\n`;
            xml += `                    <value>${this.escapeXml(macro.value)}</value>\n`;
            if (macro.description) {
                xml += `                    <description>${this.escapeXml(macro.description)}</description>\n`;
            }
            xml += '                </macro>\n';
        }
        xml += '            </macros>\n';
        return xml;
    }

    /**
     * 生成监控项XML
     */
    private static generateItems(items: Item[]): string {
        let xml = '            <items>\n';
        
        for (const item of items) {
            xml += '                <item>\n';
            xml += `                    <name>${this.escapeXml(item.name)}</name>\n`;
            xml += `                    <type>${item.type}</type>\n`;
            xml += `                    <key>${this.escapeXml(item.key)}</key>\n`;
            
            if (item.delay !== undefined) {
                xml += `                    <delay>${item.delay}</delay>\n`;
            }
            
            xml += `                    <value_type>${item.valueType}</value_type>\n`;
            
            if (item.history) {
                xml += `                    <history>${item.history}</history>\n`;
            }
            
            if (item.trends) {
                xml += `                    <trends>${item.trends}</trends>\n`;
            }
            
            // 应用
            xml += '                    <applications>\n';
            xml += '                        <application>\n';
            xml += `                            <name>${this.escapeXml(item.appName)}</name>\n`;
            xml += '                        </application>\n';
            xml += '                    </applications>\n';
            
            // 预处理
            if (item.preprocessingType && item.preprocessingParams) {
                xml += '                    <preprocessing>\n';
                xml += '                        <step>\n';
                xml += `                            <type>${item.preprocessingType}</type>\n`;
                xml += `                            <params>${this.escapeXml(item.preprocessingParams)}\n</params>\n`;
                xml += '                        </step>\n';
                xml += '                    </preprocessing>\n';
            }
            
            // 主监控项
            if (item.masterItem) {
                xml += '                    <master_item>\n';
                xml += `                        <key>${this.escapeXml(item.masterItem)}</key>\n`;
                xml += '                    </master_item>\n';
            }
            
            xml += '                </item>\n';
        }
        
        xml += '            </items>\n';
        return xml;
    }

    /**
     * 生成发现规则XML
     */
    private static generateDiscoveryRules(rules: DiscoveryRule[], defaultAppName?: string): string {
        let xml = '            <discovery_rules>\n';
        
        for (const rule of rules) {
            xml += '                <discovery_rule>\n';
            xml += `                    <name>${this.escapeXml(rule.name)}</name>\n`;
            xml += `                    <type>${rule.type}</type>\n`;
            xml += `                    <key>${this.escapeXml(rule.key)}</key>\n`;
            
            if (rule.delay !== undefined) {
                xml += `                    <delay>${rule.delay}</delay>\n`;
            }
            
            if (rule.lifetime) {
                xml += `                    <lifetime>${rule.lifetime}</lifetime>\n`;
            }
            
            if (rule.description) {
                xml += `                    <description>${this.escapeXml(rule.description)}</description>\n`;
            }
            
            // 监控项原型
            if (rule.itemPrototype) {
                xml += '                    <item_prototypes>\n';
                xml += '                        <item_prototype>\n';
                xml += `                            <name>${this.escapeXml(rule.itemPrototype.name)}</name>\n`;
                xml += `                            <type>${rule.itemPrototype.type || 'DEPENDENT'}</type>\n`;
                xml += `                            <key>${this.escapeXml(rule.itemPrototype.key)}</key>\n`;
                xml += `                            <delay>${rule.itemPrototype.delay || '0'}</delay>\n`;
                xml += `                            <value_type>${rule.itemPrototype.valueType || 'FLOAT'}</value_type>\n`;
                
                // 描述（如果有）
                if (rule.itemPrototype.description) {
                    xml += `                            <description>${this.escapeXml(rule.itemPrototype.description)}</description>\n`;
                }
                
                // 应用
                xml += '                            <applications>\n';
                xml += '                                <application>\n';
                xml += `                                    <name>${this.escapeXml(rule.itemPrototype.appName || rule.appName || defaultAppName || '')}</name>\n`;
                xml += '                                </application>\n';
                xml += '                            </applications>\n';
                
                // 预处理 - 优先使用item_prototype自己的preprocessing
                if (rule.itemPrototype.preprocessing?.type && rule.itemPrototype.preprocessing?.params) {
                    xml += '                            <preprocessing>\n';
                    xml += '                                <step>\n';
                    xml += `                                    <type>${rule.itemPrototype.preprocessing.type}</type>\n`;
                    xml += `                                    <params>${this.escapeXml(rule.itemPrototype.preprocessing.params)}\n</params>\n`;
                    xml += '                                </step>\n';
                    xml += '                            </preprocessing>\n';
                } else if (rule.lldMacros) {
                    // 如果没有preprocessing，自动生成
                    const macros = rule.lldMacros.split(',').map(m => m.trim());
                    const metricName = rule.preprocessingParams?.replace(/\{\}$/, '').trim() || rule.key.replace('.discovery', '');
                    const labels = macros
                        .filter(m => m !== 'METRIC_NAME')
                        .map(m => {
                            const labelName = this.macroToLabelName(m);
                            return `${labelName}="{#${m}}"`;
                        })
                        .join(',');
                    
                    xml += '                            <preprocessing>\n';
                    xml += '                                <step>\n';
                    xml += '                                    <type>PROMETHEUS_PATTERN</type>\n';
                    xml += `                                    <params>${this.escapeXmlParams(metricName + '{' + labels + '}')}\n</params>\n`;
                    xml += '                                </step>\n';
                    xml += '                            </preprocessing>\n';
                }
                
                // 主监控项 - 优先使用item_prototype的masterItem
                const protoMasterItem = rule.itemPrototype.masterItem || rule.masterItem;
                if (protoMasterItem) {
                    xml += '                            <master_item>\n';
                    xml += `                                <key>${this.escapeXml(protoMasterItem)}</key>\n`;
                    xml += '                            </master_item>\n';
                }
                
                xml += '                        </item_prototype>\n';
                xml += '                    </item_prototypes>\n';
            }
            
            // 主监控项
            if (rule.masterItem) {
                xml += '                    <master_item>\n';
                xml += `                        <key>${this.escapeXml(rule.masterItem)}</key>\n`;
                xml += '                    </master_item>\n';
            }
            
            // LLD宏路径
            if (rule.lldMacros) {
                xml += this.generateLldMacroPaths(rule.lldMacros);
            }
            
            // 预处理
            if (rule.preprocessingType && rule.preprocessingParams) {
                xml += '                    <preprocessing>\n';
                xml += '                        <step>\n';
                xml += `                            <type>${rule.preprocessingType}</type>\n`;
                xml += `                            <params>${this.escapeXml(rule.preprocessingParams)}</params>\n`;
                xml += '                        </step>\n';
                xml += '                    </preprocessing>\n';
            }
            
            xml += '                </discovery_rule>\n';
        }
        
        xml += '            </discovery_rules>\n';
        return xml;
    }

    /**
     * 生成LLD宏路径映射
     */
    private static generateLldMacroPaths(lldMacros: string): string {
        const macros = lldMacros.split(',').map(m => m.trim());
        let xml = '                    <lld_macro_paths>\n';
        
        for (const macro of macros) {
            const labelName = this.macroToLabelName(macro);
            xml += '                        <lld_macro_path>\n';
            xml += `                            <lld_macro>{#${macro}}</lld_macro>\n`;
            
            if (macro === 'METRIC_NAME') {
                xml += `                            <path>$['name']</path>\n`;
            } else {
                xml += `                            <path>$.labels['${labelName}']</path>\n`;
            }
            
            xml += '                        </lld_macro_path>\n';
        }
        
        xml += '                    </lld_macro_paths>\n';
        return xml;
    }

    /**
     * 将宏名称转换为标签名称
     * 例如: APPID -> appId, COUNTTYPE -> countType, TENANTID -> tenantId
     */
    private static macroToLabelName(macro: string): string {
        // 特殊映射规则，确保与Prometheus数据中的标签名称一致
        const specialMappings: { [key: string]: string } = {
            'APPID': 'appId',
            'COUNTTYPE': 'countType', 
            'TENANTID': 'tenantId',
            'METHOD': 'method',
            'STATE': 'state',
            'URL': 'url',
            'SOURCE': 'source'
        };
        
        if (specialMappings[macro]) {
            return specialMappings[macro];
        }
        
        // 默认转换规则
        const parts = macro.toLowerCase().split('_');
        return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }

    /**
     * XML字符转义
     */
    private static escapeXml(unsafe: string): string {
        if (!unsafe) {
            return '';
        }
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * XML参数内容转义（不转义引号，因为参数内容中的引号是合法的）
     */
    private static escapeXmlParams(unsafe: string): string {
        if (!unsafe) {
            return '';
        }
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

