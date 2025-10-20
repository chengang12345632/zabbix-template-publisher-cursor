import axios, { AxiosInstance } from 'axios';
import * as path from 'path';
import { Logger } from '../utils/logger';

/**
 * NextCloud WebDAV客户端
 */
export class NextCloudClient {
    private axiosInstance: AxiosInstance;
    private basePath: string;
    private webdavUsername: string; // WebDAV文件空间用户名

    constructor(
        private url: string,
        private username: string,
        private password: string,
        basePath: string = '/云平台开发部/监控模板',
        webdavUsername?: string // 可选的WebDAV文件空间用户名
    ) {
        this.basePath = basePath;
        // 如果提供了webdavUsername，使用它；否则使用username
        this.webdavUsername = webdavUsername || username;
        
        // 去除URL末尾的斜杠
        const cleanUrl = url.replace(/\/$/, '');
        
        // 构建WebDAV URL（使用webdavUsername）
        const webdavUrl = `${cleanUrl}/remote.php/dav/files/${encodeURIComponent(this.webdavUsername)}`;
        
        Logger.info('NextCloud配置信息:');
        Logger.info(`  - 服务器URL: ${cleanUrl}`);
        Logger.info(`  - WebDAV完整路径: ${webdavUrl}`);
        Logger.info(`  - 基础路径: ${basePath}`);
        Logger.info(`  - 认证用户名 (auth.username): ${username}`);
        Logger.info(`  - WebDAV路径用户名 (路径中): ${this.webdavUsername}`);
        Logger.info(`  - 密码已配置: ${password ? '是 (' + password.substring(0, 5) + '***)' : '否 (未配置!)'}`);
        if (webdavUsername && webdavUsername !== username) {
            Logger.warn(`  ⚠️ 注意: 认证用户名(${username})与WebDAV路径用户名(${this.webdavUsername})不同`);
        }
        
        // 使用认证用户名进行Basic Auth
        Logger.info(`  - Basic Auth将使用: username="${this.username}", password="${password ? '已配置' : '未配置'}"`);
        
        this.axiosInstance = axios.create({
            baseURL: webdavUrl,
            auth: {
                username: this.username, // 认证使用username (传入的第二个参数)
                password: this.password
            },
            headers: {
                'Content-Type': 'application/xml'
            }
        });
    }

    /**
     * 创建目录（如果不存在）
     */
    private async createDirectoryIfNotExists(dirPath: string): Promise<void> {
        try {
            // 检查目录是否存在
            await this.axiosInstance.request({
                method: 'PROPFIND',
                url: dirPath,
                headers: {
                    'Depth': '0'
                }
            });
        } catch (error: any) {
            if (error.response?.status === 404) {
                // 目录不存在，创建它
                await this.axiosInstance.request({
                    method: 'MKCOL',
                    url: dirPath
                });
            } else {
                throw error;
            }
        }
    }

    /**
     * 上传文件到NextCloud
     */
    public async uploadFile(
        fileName: string,
        content: string,
        subdirectory?: string
    ): Promise<string> {
        try {
            // 构建完整路径
            let targetPath = this.basePath;
            if (subdirectory) {
                targetPath = path.posix.join(targetPath, subdirectory);
            }
            
            Logger.info(`准备上传文件: ${fileName}`);
            Logger.info(`  - 目标路径: ${targetPath}`);
            
            // 确保目录存在
            await this.ensureDirectoryPath(targetPath);
            
            // 上传文件
            const filePath = path.posix.join(targetPath, fileName);
            await this.axiosInstance.put(filePath, content, {
                headers: {
                    'Content-Type': 'application/xml'
                }
            });
            
            // 构建可访问的URL
            const fileUrl = this.getFileUrl(filePath);
            Logger.success(`✓ 文件已上传: ${fileName}`);
            Logger.info(`  - 访问链接: ${fileUrl}`);
            
            return fileUrl;
        } catch (error: any) {
            Logger.error('========================================');
            Logger.error('上传文件失败 - 详细诊断信息:');
            Logger.error(`  - HTTP状态码: ${error.response?.status || 'unknown'}`);
            Logger.error(`  - HTTP状态文本: ${error.response?.statusText || 'unknown'}`);
            Logger.error(`  - 请求URL: ${error.config?.url || 'unknown'}`);
            Logger.error(`  - 完整URL: ${error.config?.baseURL || ''}${error.config?.url || ''}`);
            Logger.error(`  - 请求方法: ${error.config?.method?.toUpperCase() || 'unknown'}`);
            
            // 打印认证信息（隐藏密码）
            if (error.config?.auth) {
                Logger.error(`  - Basic Auth用户名: ${error.config.auth.username || '(未设置)'}`);
                Logger.error(`  - Basic Auth密码: ${error.config.auth.password ? '已设置 (长度:' + error.config.auth.password.length + ')' : '(未设置!)'}`);
            } else {
                Logger.error(`  - Basic Auth: 未配置!`);
            }
            
            // 打印服务器响应
            if (error.response?.data) {
                Logger.error(`  - 服务器响应详情:`);
                Logger.error(error.response.data);
            }
            
            Logger.error(`  - 错误消息: ${error.message}`);
            Logger.error('========================================');
            
            if (error.response?.status === 401) {
                throw new Error(`认证失败 (401): 请检查NextCloud用户名和密码是否正确。提示：如果启用了双因素认证，需要使用应用专用密码，而不是登录密码。`);
            } else if (error.response?.status === 404) {
                throw new Error(`路径不存在 (404): ${error.config?.url}`);
            } else {
                throw new Error(`上传文件失败 (${error.response?.status || 'unknown'}): ${error.message}`);
            }
        }
    }

    /**
     * 获取文件的可访问URL
     */
    private getFileUrl(filePath: string): string {
        // 去除开头的斜杠
        const cleanPath = filePath.replace(/^\//, '');
        // 构建NextCloud文件查看URL
        return `${this.url}/index.php/f/${encodeURIComponent(cleanPath)}`;
    }

    /**
     * 创建公开分享链接（参考 cursor-doc-publish-plugin）
     */
    public async createShareLink(filePath: string): Promise<string | null> {
        try {
            Logger.info(`创建分享链接: ${filePath}`);
            
            const response = await axios({
                method: 'POST',
                url: `${this.url}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
                auth: {
                    username: this.username,
                    password: this.password
                },
                headers: {
                    'OCS-APIRequest': 'true',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: new URLSearchParams({
                    path: filePath,
                    shareType: '3', // 公开链接
                    permissions: '1' // 只读
                })
            });

            const shareUrl = response.data?.ocs?.data?.url;
            if (shareUrl) {
                Logger.success(`✓ 分享链接已创建: ${shareUrl}`);
                return shareUrl;
            }
            
            return null;
        } catch (error: any) {
            // 如果链接已存在或创建失败，不影响主流程
            Logger.warn(`创建分享链接失败（可忽略）: ${error.message}`);
            return null;
        }
    }

    /**
     * 获取或创建分享链接
     */
    public async getOrCreateShareLink(filePath: string): Promise<string | null> {
        try {
            // 先尝试获取已存在的分享链接
            const response = await axios({
                method: 'GET',
                url: `${this.url}/ocs/v2.php/apps/files_sharing/api/v1/shares`,
                auth: {
                    username: this.username,
                    password: this.password
                },
                headers: {
                    'OCS-APIRequest': 'true'
                },
                params: {
                    path: filePath,
                    reshares: true
                }
            });

            const shares = response.data?.ocs?.data;
            if (shares && shares.length > 0) {
                // 找到第一个公开链接
                const publicShare = shares.find((s: any) => s.share_type === 3);
                if (publicShare) {
                    Logger.info(`找到已存在的分享链接: ${publicShare.url}`);
                    return publicShare.url;
                }
            }

            // 如果没有，创建新的
            return await this.createShareLink(filePath);
        } catch (error: any) {
            Logger.warn(`获取分享链接失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 确保目录路径存在（递归创建）
     */
    private async ensureDirectoryPath(dirPath: string): Promise<void> {
        const parts = dirPath.split('/').filter(p => p);
        let currentPath = '';
        
        for (const part of parts) {
            currentPath = path.posix.join(currentPath, part);
            await this.createDirectoryIfNotExists(`/${currentPath}`);
        }
    }

    /**
     * 上传到版本目录和all_zabbix_template目录
     */
    public async uploadToVersionAndAllnew(
        fileName: string,
        content: string,
        version: string,
        createShare: boolean = false
    ): Promise<{ versionUrl: string; allnewUrl: string; shareUrl?: string }> {
        // 上传到版本目录
        Logger.info(`上传到版本目录: ${version}`);
        const versionUrl = await this.uploadFile(fileName, content, version);
        
        // 上传到all_zabbix_template目录
        Logger.info(`上传到all_zabbix_template目录`);
        const allnewUrl = await this.uploadFile(fileName, content, 'all_zabbix_template');
        
        // 可选：创建分享链接（针对all_zabbix_template目录的文件）
        let shareUrl: string | undefined;
        if (createShare) {
            const allnewPath = path.posix.join(this.basePath, 'all_zabbix_template', fileName);
            const share = await this.getOrCreateShareLink(allnewPath);
            if (share) {
                shareUrl = share;
            }
        }
        
        return { versionUrl, allnewUrl, shareUrl };
    }

    /**
     * 测试连接
     */
    public async testConnection(): Promise<boolean> {
        try {
            await this.axiosInstance.request({
                method: 'PROPFIND',
                url: '/',
                headers: {
                    'Depth': '0'
                }
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

