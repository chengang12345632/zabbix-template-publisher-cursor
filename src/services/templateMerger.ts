import { ZabbixTemplate } from '../types/zabbix';
import { Logger } from '../utils/logger';

/**
 * 模板合并器 - 合并多个Zabbix模板为单一模板
 */
export class TemplateMerger {
    
    /**
     * 合并多个模板为一个统一的模板
     * @param templates 要合并的模板数组（第一个应该是master模板）
     * @param mergedTemplateName 合并后的模板名称
     * @returns 合并后的模板对象
     */
    public static mergeTemplates(
        templates: ZabbixTemplate[],
        mergedTemplateName: string = 'merged_business_template'
    ): ZabbixTemplate {
        Logger.info('========================================');
        Logger.info('开始合并模板');
        Logger.info(`模板数量: ${templates.length}`);
        Logger.info('========================================');

        if (templates.length === 0) {
            throw new Error('没有可合并的模板');
        }

        // 找到master模板（作为基础模板）
        const masterTemplate = this.findMasterTemplate(templates);
        if (!masterTemplate) {
            throw new Error('未找到主监控项模板(master template)');
        }

        Logger.info(`✓ 找到主监控项模板: ${masterTemplate.name}`);

        // 创建合并后的模板
        const mergedTemplate: ZabbixTemplate = {
            template: mergedTemplateName,
            name: mergedTemplateName,
            version: masterTemplate.version || '5.0',
            groups: [],
            applications: [],
            templates: [], // 合并后的模板不再有依赖
            macros: [],
            items: [],
            discoveryRules: []
        };

        // 合并所有模板的内容
        for (const template of templates) {
            Logger.info(`────────────────────────────────────────`);
            Logger.info(`处理模板: ${template.name}`);
            Logger.info(`  - 模板组: ${template.groups?.length || 0}`);
            Logger.info(`  - 应用分组: ${template.applications?.length || 0}`);
            Logger.info(`  - 宏定义: ${template.macros?.length || 0}`);
            Logger.info(`  - 监控项: ${template.items?.length || 0}`);
            Logger.info(`  - 发现规则: ${template.discoveryRules?.length || 0}`);
            
            // 合并模板组
            this.mergeGroups(mergedTemplate, template);
            
            // 合并应用分组
            this.mergeApplications(mergedTemplate, template);
            
            // 合并宏定义
            this.mergeMacros(mergedTemplate, template);
            
            // 合并监控项
            this.mergeItems(mergedTemplate, template);
            
            // 合并发现规则
            this.mergeDiscoveryRules(mergedTemplate, template);
            
            Logger.success(`✓ ${template.name} 合并完成`);
        }
        Logger.info(`────────────────────────────────────────`);

        // 添加合并元信息
        this.addMergeMetadata(mergedTemplate, templates);

        Logger.info('========================================');
        Logger.success('✓ 模板合并完成！');
        Logger.info(`  - 模板组: ${mergedTemplate.groups.length}`);
        Logger.info(`  - 应用分组: ${mergedTemplate.applications.length}`);
        Logger.info(`  - 宏定义: ${mergedTemplate.macros?.length || 0}`);
        Logger.info(`  - 监控项: ${mergedTemplate.items.length}`);
        Logger.info(`  - 发现规则: ${mergedTemplate.discoveryRules.length}`);
        Logger.info('========================================');

        return mergedTemplate;
    }

    /**
     * 查找master模板
     */
    private static findMasterTemplate(templates: ZabbixTemplate[]): ZabbixTemplate | undefined {
        const master = templates.find(t => 
            t.template.toLowerCase().includes('master') || 
            t.name.toLowerCase().includes('master')
        );
        
        if (master) {
            Logger.info(`识别主模板: ${master.name}`);
        }
        
        return master;
    }

    /**
     * 合并模板组
     */
    private static mergeGroups(target: ZabbixTemplate, source: ZabbixTemplate): void {
        if (!source.groups) {
            return;
        }

        for (const group of source.groups) {
            // 检查是否已存在
            const exists = target.groups.some(g => g.name === group.name);
            if (!exists) {
                target.groups.push({ ...group });
            }
        }
    }

    /**
     * 合并应用分组
     */
    private static mergeApplications(target: ZabbixTemplate, source: ZabbixTemplate): void {
        if (!source.applications) {
            return;
        }

        for (const app of source.applications) {
            // 检查是否已存在
            const exists = target.applications.some(a => a.name === app.name);
            if (!exists) {
                target.applications.push({ ...app });
            }
        }
    }

    /**
     * 合并宏定义
     */
    private static mergeMacros(target: ZabbixTemplate, source: ZabbixTemplate): void {
        if (!source.macros) {
            return;
        }

        if (!target.macros) {
            target.macros = [];
        }

        for (const macro of source.macros) {
            // 检查是否已存在同名宏
            const existingIndex = target.macros.findIndex(m => m.macro === macro.macro);
            
            if (existingIndex >= 0) {
                // 如果已存在，检查值是否相同
                if (target.macros[existingIndex].value !== macro.value) {
                    Logger.warn(`宏定义冲突: ${macro.macro}`);
                    Logger.warn(`  - 现有值: ${target.macros[existingIndex].value}`);
                    Logger.warn(`  - 新值: ${macro.value}`);
                    Logger.warn(`  - 保留现有值`);
                }
            } else {
                target.macros.push({ ...macro });
            }
        }
    }

    /**
     * 合并监控项
     */
    private static mergeItems(target: ZabbixTemplate, source: ZabbixTemplate): void {
        if (!source.items) {
            Logger.info(`  - 该模板没有监控项，跳过`);
            return;
        }

        Logger.info(`  - 合并 ${source.items.length} 个监控项`);

        for (const item of source.items) {
            // 检查是否已存在同Key的监控项
            const exists = target.items.some(i => i.key === item.key);
            
            if (exists) {
                Logger.warn(`    ⚠️ 监控项Key冲突: ${item.key} (${item.name})`);
                Logger.warn(`       跳过重复的监控项`);
            } else {
                // 复制监控项，确保所有DEPENDENT类型的监控项都引用正确的master_item
                target.items.push({ ...item });
                Logger.info(`    ✓ 添加监控项: ${item.name}`);
            }
        }
    }

    /**
     * 合并发现规则
     */
    private static mergeDiscoveryRules(target: ZabbixTemplate, source: ZabbixTemplate): void {
        if (!source.discoveryRules) {
            Logger.info(`  - 该模板没有发现规则，跳过`);
            return;
        }

        Logger.info(`  - 合并 ${source.discoveryRules.length} 个发现规则`);

        for (const rule of source.discoveryRules) {
            // 检查是否已存在同Key的发现规则
            const exists = target.discoveryRules.some(r => r.key === rule.key);
            
            if (exists) {
                Logger.warn(`    ⚠️ 发现规则Key冲突: ${rule.key} (${rule.name})`);
                Logger.warn(`       跳过重复的发现规则`);
            } else {
                // 复制发现规则（深拷贝，包括itemPrototype）
                const copiedRule = {
                    ...rule,
                    itemPrototype: rule.itemPrototype ? { 
                        ...rule.itemPrototype,
                        preprocessing: rule.itemPrototype.preprocessing ? {
                            ...rule.itemPrototype.preprocessing
                        } : undefined
                    } : undefined
                };
                target.discoveryRules.push(copiedRule);
                Logger.info(`    ✓ 添加发现规则: ${rule.name}`);
            }
        }
    }

    /**
     * 添加合并元信息
     */
    private static addMergeMetadata(mergedTemplate: ZabbixTemplate, sourceTemplates: ZabbixTemplate[]): void {
        // 生成组件列表
        const componentNames = sourceTemplates
            .map(t => t.template)
            .filter(name => !name.toLowerCase().includes('master'))
            .join(',');

        // 添加合并信息宏
        const mergeInfoMacros = [
            {
                macro: '{$MERGED_COMPONENTS}',
                value: `master,${componentNames}`,
                description: '合并的组件列表'
            },
            {
                macro: '{$MERGED_VERSION}',
                value: 'v1.0.0',
                description: '合并模板版本'
            },
            {
                macro: '{$MERGED_DATE}',
                value: new Date().toISOString().split('T')[0],
                description: '合并日期'
            }
        ];

        // 只添加不存在的宏
        if (!mergedTemplate.macros) {
            mergedTemplate.macros = [];
        }
        for (const macro of mergeInfoMacros) {
            const exists = mergedTemplate.macros.some(m => m.macro === macro.macro);
            if (!exists) {
                mergedTemplate.macros.push(macro);
            }
        }
    }

    /**
     * 验证合并后的模板
     */
    public static validateMergedTemplate(template: ZabbixTemplate): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // 检查基本信息
        if (!template.template || !template.name) {
            errors.push('模板缺少基本信息(template或name)');
        }

        // 检查是否有监控项或发现规则
        if (template.items.length === 0 && template.discoveryRules.length === 0) {
            errors.push('模板没有任何监控项或发现规则');
        }

        // 检查DEPENDENT类型的监控项是否有master_item
        for (const item of template.items) {
            if (item.type === 'DEPENDENT' && !item.masterItem) {
                errors.push(`DEPENDENT类型监控项缺少master_item: ${item.name} (${item.key})`);
            }
        }

        // 检查发现规则的master_item
        for (const rule of template.discoveryRules) {
            if (rule.type === 'DEPENDENT' && !rule.masterItem) {
                errors.push(`DEPENDENT类型发现规则缺少master_item: ${rule.name} (${rule.key})`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

