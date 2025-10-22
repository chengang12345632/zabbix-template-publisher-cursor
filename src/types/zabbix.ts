/**
 * Zabbix模板类型定义
 */

export interface ZabbixTemplate {
    template: string;
    name: string;
    version: string;
    groups: TemplateGroup[];
    applications: Application[];
    templates?: TemplateDependency[];
    macros?: Macro[];
    items: Item[];
    discoveryRules: DiscoveryRule[];
}

export interface TemplateGroup {
    name: string;
}

export interface Application {
    name: string;
}

export interface TemplateDependency {
    name: string;
}

export interface Macro {
    macro: string;
    value: string;
    description?: string;
}

export interface Item {
    name: string;
    key: string;
    type: string;
    valueType: string;
    delay?: string;
    history?: string;
    trends?: string;
    masterItem?: string;
    preprocessingType?: string;
    preprocessingParams?: string;
    appName: string;
}

export interface DiscoveryRule {
    name: string;
    key: string;
    type: string;
    delay?: string;
    lifetime?: string;
    description?: string;
    masterItem?: string;
    preprocessingType?: string;
    preprocessingParams?: string;
    lldMacros?: string;
    appName: string;
    itemPrototype?: ItemPrototype;
}

export interface ItemPrototype {
    name: string;
    key: string;
    type?: string;
    delay?: string;
    valueType?: string;
    description?: string;
    masterItem?: string;
    preprocessing?: {
        type?: string;
        params?: string;
    };
    appName?: string;
}

/**
 * Properties配置文件解析结果
 */
export interface PropertiesConfig {
    [key: string]: string | undefined;
}

/**
 * 插件配置
 */
export interface PluginConfig {
    nextcloud: {
        url: string;
        username: string;
        webdavUsername?: string; // WebDAV文件空间用户名（可选）
        password: string;
        basePath: string;
    };
    zabbix?: {
        url: string;
        username: string;
        password: string;
    };
}

/**
 * 发布结果
 */
export interface PublishResult {
    success: boolean;
    message: string;
    details?: {
        xmlFiles: string[];
        nextcloudUploaded: boolean;
        zabbixImported: boolean;
    };
}

