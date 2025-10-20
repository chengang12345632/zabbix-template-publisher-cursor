import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import * as http from 'http';
import { Logger } from '../utils/logger';

/**
 * Zabbix API客户端
 */
export class ZabbixClient {
    private axiosInstance: AxiosInstance;
    private authToken?: string;

    constructor(
        private url: string,
        private username: string,
        private password: string
    ) {
        Logger.info('Zabbix配置信息:');
        Logger.info(`  - URL: ${url}`);
        Logger.info(`  - 用户名: ${username}`);
        
        // 创建一个跳过SSL证书验证的HTTPS Agent
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false  // 跳过SSL证书验证（适用于自签名证书）
        });
        
        Logger.info(`  - SSL证书验证: 已禁用（允许自签名证书）`);
        
        this.axiosInstance = axios.create({
            baseURL: `${url}/api_jsonrpc.php`,
            headers: {
                'Content-Type': 'application/json-rpc'
            },
            httpsAgent: httpsAgent,  // HTTPS Agent（跳过SSL验证）
            httpAgent: new http.Agent(),  // HTTP Agent（以防重定向）
            timeout: 30000,  // 30秒超时
            proxy: false,  // 禁用代理
            maxRedirects: 5  // 最大重定向次数
        });
    }

    /**
     * 登录获取认证令牌
     */
    private async login(): Promise<void> {
        // 保存原始的环境变量值
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        
        try {
            Logger.info('正在登录Zabbix...');
            
            // 临时禁用SSL证书验证
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            
            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'user.login',
                params: {
                    user: this.username,
                    password: this.password
                },
                id: 1
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            this.authToken = response.data.result;
            Logger.success('✓ Zabbix登录成功');
        } catch (error: any) {
            Logger.error('Zabbix登录失败', error);
            throw new Error(`Zabbix登录失败: ${error.message}`);
        } finally {
            // 恢复原始的环境变量值
            if (originalRejectUnauthorized === undefined) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            } else {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
        }
    }

    /**
     * 确保已登录
     */
    private async ensureLoggedIn(): Promise<void> {
        if (!this.authToken) {
            await this.login();
        }
    }

    /**
     * 检查主机组是否存在
     */
    public async hostGroupExists(groupName: string): Promise<boolean> {
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        
        try {
            await this.ensureLoggedIn();
            
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            
            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'hostgroup.get',
                params: {
                    filter: {
                        name: groupName
                    }
                },
                auth: this.authToken,
                id: 6
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            return response.data.result && response.data.result.length > 0;
        } catch (error: any) {
            Logger.warn(`检查主机组失败: ${groupName}`, error.message);
            return false;
        } finally {
            if (originalRejectUnauthorized === undefined) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            } else {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
        }
    }

    /**
     * 创建主机组
     */
    public async createHostGroup(groupName: string): Promise<void> {
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        
        try {
            await this.ensureLoggedIn();
            
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            
            Logger.info(`创建主机组: ${groupName}`);
            
            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'hostgroup.create',
                params: {
                    name: groupName
                },
                auth: this.authToken,
                id: 7
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            Logger.success(`✓ 主机组创建成功: ${groupName}`);
        } catch (error: any) {
            Logger.error(`创建主机组失败: ${groupName}`, error);
            throw new Error(`创建主机组失败: ${error.message}`);
        } finally {
            if (originalRejectUnauthorized === undefined) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            } else {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
        }
    }

    /**
     * 确保主机组存在（不存在则创建）
     */
    public async ensureHostGroups(groupNames: string[]): Promise<void> {
        for (const groupName of groupNames) {
            const exists = await this.hostGroupExists(groupName);
            if (!exists) {
                Logger.info(`主机组不存在，将自动创建: ${groupName}`);
                await this.createHostGroup(groupName);
            } else {
                Logger.info(`主机组已存在: ${groupName}`);
            }
        }
    }

    /**
     * 导入模板
     */
    public async importTemplate(xmlContent: string, templateName: string): Promise<void> {
        // 保存原始的环境变量值
        const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        
        try {
            await this.ensureLoggedIn();

            // 临时禁用SSL证书验证
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
            
            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'configuration.import',
                params: {
                    format: 'xml',
                    rules: {
                        templates: {
                            createMissing: true,
                            updateExisting: true
                        },
                        applications: {
                            createMissing: true,
                            deleteMissing: false
                        },
                        items: {
                            createMissing: true,
                            updateExisting: true
                        },
                        discoveryRules: {
                            createMissing: true,
                            updateExisting: true
                        },
                        triggers: {
                            createMissing: true,
                            updateExisting: true
                        },
                        graphs: {
                            createMissing: true,
                            updateExisting: true
                        },
                        templateLinkage: {
                            createMissing: true,
                            deleteMissing: false
                        },
                        templateScreens: {
                            createMissing: true,
                            updateExisting: true
                        }
                    },
                    source: xmlContent
                },
                auth: this.authToken,
                id: 2
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            // 导入成功的日志在extension.ts中记录
        } catch (error: any) {
            Logger.error(`导入模板失败: ${templateName}`, error);
            throw new Error(`导入模板失败: ${error.message}`);
        } finally {
            // 恢复原始的环境变量值
            if (originalRejectUnauthorized === undefined) {
                delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
            } else {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
            }
        }
    }

    /**
     * 检查模板是否存在
     */
    public async templateExists(templateName: string): Promise<boolean> {
        try {
            await this.ensureLoggedIn();

            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'template.get',
                params: {
                    filter: {
                        host: templateName
                    }
                },
                auth: this.authToken,
                id: 3
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            return response.data.result && response.data.result.length > 0;
        } catch (error: any) {
            Logger.warn(`检查模板失败: ${templateName}`, error.message);
            return false;
        }
    }

    /**
     * 检查主监控项是否存在
     */
    public async masterItemExists(itemKey: string): Promise<boolean> {
        try {
            await this.ensureLoggedIn();

            const response = await this.axiosInstance.post('', {
                jsonrpc: '2.0',
                method: 'item.get',
                params: {
                    filter: {
                        key_: itemKey
                    }
                },
                auth: this.authToken,
                id: 4
            });

            if (response.data.error) {
                throw new Error(response.data.error.data);
            }

            return response.data.result && response.data.result.length > 0;
        } catch (error: any) {
            Logger.warn(`检查监控项失败: ${itemKey}`, error.message);
            return false;
        }
    }

    /**
     * 测试连接
     */
    public async testConnection(): Promise<boolean> {
        try {
            await this.login();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * 登出
     */
    public async logout(): Promise<void> {
        if (this.authToken) {
            try {
                await this.axiosInstance.post('', {
                    jsonrpc: '2.0',
                    method: 'user.logout',
                    params: [],
                    auth: this.authToken,
                    id: 5
                });
            } catch (error) {
                // 忽略登出错误
            }
            this.authToken = undefined;
        }
    }
}

