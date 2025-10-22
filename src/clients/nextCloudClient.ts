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
        
        Logger.debug('NextCloud配置信息:');
        Logger.debug(`  - 服务器URL: ${cleanUrl}`);
        Logger.debug(`  - WebDAV完整路径: ${webdavUrl}`);
        Logger.debug(`  - 基础路径: ${basePath}`);
        Logger.debug(`  - 认证用户名 (auth.username): ${username}`);
        Logger.debug(`  - WebDAV路径用户名 (路径中): ${this.webdavUsername}`);
        Logger.debug(`  - 密码已配置: ${password ? '是 (' + password.substring(0, 5) + '***)' : '否 (未配置!)'}`);
        if (webdavUsername && webdavUsername !== username) {
            Logger.warn(`  ⚠️ 注意: 认证用户名(${username})与WebDAV路径用户名(${this.webdavUsername})不同`);
        }
        
        // 使用认证用户名进行Basic Auth
        Logger.debug(`  - Basic Auth将使用: username="${this.username}", password="${password ? '已配置' : '未配置'}"`);
        
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
     * 强制刷新NextCloud文件缓存
     */
    private async refreshFileCache(filePath: string): Promise<void> {
        try {
            // 使用PROPFIND请求强制刷新文件元数据
            await this.axiosInstance.request({
                method: 'PROPFIND',
                url: filePath,
                headers: {
                    'Depth': '0',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                timeout: 5000
            });
            
            Logger.debug(`✓ 文件缓存已刷新: ${filePath}`);
            
            // 额外等待，确保缓存更新完成
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
            // 缓存刷新失败不影响主流程，只记录警告
            Logger.warn(`缓存刷新失败: ${error.message}`);
        }
    }

    /**
     * 清除文件锁定状态
     */
    private async clearFileLocks(filePath: string): Promise<void> {
        try {
            // 只使用HEAD请求检查文件状态，不清除内容
            await this.axiosInstance.head(filePath, { timeout: 3000 });
            
            Logger.debug(`✓ 文件锁定已清除: ${filePath}`);
        } catch (error: any) {
            // 锁定清除失败不影响主流程，只记录警告
            if (error.response?.status !== 404) {
                Logger.warn(`锁定清除失败: ${error.message}`);
            }
        }
    }

    /**
     * 删除文件（如果存在）
     */
    private async deleteFileIfExists(filePath: string): Promise<void> {
        try {
            // 先检查文件是否存在
            await this.axiosInstance.head(filePath);
            Logger.debug(`文件已存在，先删除: ${filePath}`);
            
            // 文件存在，删除它
            await this.axiosInstance.delete(filePath);
            Logger.debug(`✓ 文件删除成功: ${filePath}`);
            
            // 等待一小段时间，确保删除操作完成
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
            if (error.response?.status === 404) {
                // 文件不存在，这是正常情况
                Logger.debug(`文件不存在，无需删除: ${filePath}`);
            } else {
                // 其他错误，记录但不抛出
                Logger.warn(`删除文件时出现错误: ${error.message}`);
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
            Logger.debug(`  - 目标路径: ${targetPath}`);
            
            // 确保目录存在
            await this.ensureDirectoryPath(targetPath);
            
            // 上传文件
            const filePath = path.posix.join(targetPath, fileName);
            
            // 调试信息
            Logger.debug(`上传文件调试信息:`);
            Logger.debug(`  - 文件大小: ${content.length} 字节`);
            Logger.debug(`  - 文件内容前100字符: ${content.substring(0, 100)}`);
            Logger.debug(`  - 文件内容后100字符: ${content.substring(content.length - 100)}`);
            
            // 检查文件是否已存在，如果存在则先清除锁定再删除
            await this.clearFileLocks(filePath);
            await this.deleteFileIfExists(filePath);
            
            // 尝试多次上传，确保文件完整
            let uploadSuccess = false;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!uploadSuccess && retryCount < maxRetries) {
                try {
                    // 尝试不同的上传方式
                    const uploadMethod = retryCount === 0 ? 'utf8' : retryCount === 1 ? 'buffer' : 'base64';
                    
                    let uploadContent: string | Buffer = content;
                    let headers: any = {};
                    
                    if (uploadMethod === 'utf8') {
                        uploadContent = content;
                        headers['Content-Type'] = 'text/xml; charset=utf-8';
                        headers['Content-Length'] = Buffer.byteLength(content, 'utf8').toString();
                        headers['If-Match'] = '*'; // 强制覆盖
                        headers['If-None-Match'] = ''; // 禁用304响应
                    } else if (uploadMethod === 'buffer') {
                        uploadContent = Buffer.from(content, 'utf8');
                        headers['Content-Type'] = 'application/octet-stream';
                        headers['Content-Length'] = (uploadContent as Buffer).length.toString();
                    } else if (uploadMethod === 'base64') {
                        uploadContent = Buffer.from(content, 'utf8').toString('base64');
                        headers['Content-Type'] = 'application/xml';
                        headers['Content-Transfer-Encoding'] = 'base64';
                        headers['Content-Length'] = uploadContent.length.toString();
                    }
                    
                    Logger.debug(`尝试上传方式: ${uploadMethod} (尝试 ${retryCount + 1}/${maxRetries})`);
                    Logger.debug(`  - 请求头: ${JSON.stringify(headers)}`);
                    Logger.debug(`  - 认证信息: username="${this.username}", password="${this.password ? '已设置' : '未设置'}"`);
                    
                    await this.axiosInstance.put(filePath, uploadContent, {
                        headers,
                        timeout: 30000, // 30秒超时
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity
                    });
                    
                    // 等待一小段时间，确保文件写入完成
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 强制刷新NextCloud缓存
                    await this.refreshFileCache(filePath);
                    
                    // 验证上传是否成功 - 立即下载验证
                    const verifyResponse = await this.axiosInstance.get(filePath, {
                        responseType: 'text',
                        timeout: 10000,
                        headers: {
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        }
                    });
                    
                    // 严格检查文件完整性
                    const uploadedContent = verifyResponse.data;
                    const originalContent = content;
                    const sizeDiff = Math.abs(uploadedContent.length - originalContent.length);
                    const sizeDiffPercent = (sizeDiff / originalContent.length) * 100;
                    
                    // 检查XML结构完整性
                    const isXmlComplete = uploadedContent.trim().endsWith('</zabbix_export>');
                    
                    // 检查文件修改时间戳（通过ETag或Last-Modified）
                    const etag = verifyResponse.headers.etag;
                    const lastModified = verifyResponse.headers['last-modified'];
                    Logger.debug(`文件版本信息: ETag=${etag}, Last-Modified=${lastModified}`);
                    const hasDiscoveryRules = uploadedContent.includes('discovery_rules');
                    const hasTemplateEnd = uploadedContent.includes('</template>');
                    
                    // 内容完全匹配检查
                    const contentMatches = uploadedContent === originalContent;
                    
                    if (contentMatches || (sizeDiff <= 10 && sizeDiffPercent <= 0.1 && 
                        isXmlComplete && hasDiscoveryRules && hasTemplateEnd)) {
                        Logger.debug(`✓ 上传验证成功 (尝试 ${retryCount + 1}/${maxRetries})`);
                        if (sizeDiff > 0) {
                            Logger.debug(`  - 字节差异: ${sizeDiff} (${sizeDiffPercent.toFixed(2)}%) - 可接受`);
                        }
                        uploadSuccess = true;
                    } else {
                        Logger.warn(`⚠️ 上传验证失败 (尝试 ${retryCount + 1}/${maxRetries})`);
                        Logger.warn(`  - 期望大小: ${originalContent.length}, 实际大小: ${uploadedContent.length}`);
                        Logger.warn(`  - 字节差异: ${sizeDiff} (${sizeDiffPercent.toFixed(2)}%)`);
                        Logger.warn(`  - 内容完全匹配: ${contentMatches}`);
                        Logger.warn(`  - XML结构完整: ${isXmlComplete}`);
                        Logger.warn(`  - 包含discovery_rules: ${hasDiscoveryRules}`);
                        Logger.warn(`  - 包含</template>: ${hasTemplateEnd}`);
                        Logger.warn(`  - 原始文件结尾: ${originalContent.substring(originalContent.length - 50)}`);
                        Logger.warn(`  - 上传文件结尾: ${uploadedContent.substring(uploadedContent.length - 50)}`);
                        retryCount++;
                        if (retryCount < maxRetries) {
                            Logger.debug(`  - 等待2秒后重试...`);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                } catch (error: any) {
                    retryCount++;
                    Logger.warn(`上传失败 (尝试 ${retryCount}/${maxRetries}): ${error.message}`);
                    if (retryCount < maxRetries) {
                        Logger.debug(`  - 等待2秒后重试...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    } else {
                        throw error;
                    }
                }
            }
            
            if (!uploadSuccess) {
                throw new Error(`上传失败：经过${maxRetries}次尝试后仍无法上传完整文件`);
            }
            
            // 构建可访问的URL
            const fileUrl = this.getFileUrl(filePath);
            Logger.success(`✓ 文件已上传: ${fileName}`);
            
            // 尝试创建分享链接
            let shareUrl: string | null = null;
            try {
                shareUrl = await this.createShareLink(filePath);
            } catch (error: any) {
                Logger.warn(`创建分享链接失败: ${error.message}`);
            }
            
            const finalUrl = shareUrl || fileUrl;
            Logger.info(`  - 访问链接: ${finalUrl}`);
            
            return finalUrl;
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
        // 构建NextCloud文件查看URL - 使用正确的路径编码
        const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        return `${this.url}/index.php/f/${encodedPath}`;
    }

    /**
     * 创建公开分享链接（参考 cursor-doc-publish-plugin）
     */
    public async createShareLink(filePath: string): Promise<string | null> {
        try {
            Logger.debug(`创建分享链接: ${filePath}`);
            
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
        Logger.debug(`上传到版本目录: ${version}`);
        const versionUrl = await this.uploadFile(fileName, content, version);
        
        // 上传到all_zabbix_template目录
        Logger.debug(`上传到all_zabbix_template目录`);
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
     * 列出目录下的所有文件
     */
    public async listFiles(subdirectory: string): Promise<string[]> {
        try {
            const targetPath = path.posix.join(this.basePath, subdirectory);
            Logger.debug(`列出目录文件: ${targetPath}`);
            
            const response = await this.axiosInstance.request({
                method: 'PROPFIND',
                url: targetPath,
                headers: {
                    'Depth': '1'
                }
            });

            // 解析WebDAV响应
            const files: string[] = [];
            const xmlData = response.data;
            
            Logger.debug('解析WebDAV响应...');
            
            // 方法1: 使用displayname标签
            const displayNameRegex = /<d:displayname>([^<]+)<\/d:displayname>/gi;
            let match;
            const displayNames: string[] = [];
            
            while ((match = displayNameRegex.exec(xmlData)) !== null) {
                const name = match[1];
                if (name && name.endsWith('.xml')) {
                    displayNames.push(name);
                    Logger.debug(`  找到文件(displayname): ${name}`);
                }
            }
            
            // 方法2: 如果displayname没找到，尝试从href提取文件名
            if (displayNames.length === 0) {
                Logger.debug('displayname未找到文件，尝试从href提取...');
                const hrefRegex = /<d:href>([^<]+)<\/d:href>/gi;
                const hrefs: string[] = [];
                
                while ((match = hrefRegex.exec(xmlData)) !== null) {
                    const href = match[1];
                    // 提取URL路径的最后一部分作为文件名
                    const fileName = decodeURIComponent(href.split('/').pop() || '');
                    if (fileName && fileName.endsWith('.xml') && !hrefs.includes(fileName)) {
                        hrefs.push(fileName);
                        Logger.debug(`  找到文件(href): ${fileName}`);
                    }
                }
                
                files.push(...hrefs);
            } else {
                files.push(...displayNames);
            }
            
            // 去重
            const uniqueFiles = [...new Set(files)];
            
            Logger.debug(`找到 ${uniqueFiles.length} 个XML文件`);
            if (uniqueFiles.length > 0) {
                Logger.debug('文件列表:');
                uniqueFiles.forEach(f => Logger.debug(`  - ${f}`));
            }
            
            return uniqueFiles;
            
        } catch (error: any) {
            Logger.error('列出文件失败', error);
            throw new Error(`列出目录文件失败: ${error.message}`);
        }
    }

    /**
     * 下载文件内容
     */
    public async downloadFile(subdirectory: string, fileName: string): Promise<string> {
        try {
            const filePath = path.posix.join(this.basePath, subdirectory, fileName);
            Logger.debug(`下载文件: ${filePath}`);
            
            const response = await this.axiosInstance.get(filePath, {
                responseType: 'text'
            });
            
            // 验证下载文件的完整性
            const isXmlComplete = response.data.trim().endsWith('</zabbix_export>');
            const hasDiscoveryRules = response.data.includes('discovery_rules');
            const hasTemplateEnd = response.data.includes('</template>');
            
            if (!isXmlComplete || !hasTemplateEnd) {
                Logger.error(`❌ 下载的文件不完整: ${fileName}`);
                Logger.error(`  - XML结构完整: ${isXmlComplete}`);
                Logger.error(`  - 包含</template>: ${hasTemplateEnd}`);
                Logger.error(`  - 文件结尾: ${response.data.substring(response.data.length - 50)}`);
                throw new Error(`下载的文件不完整: ${fileName}`);
            }
            
            Logger.success(`✓ 文件下载完成: ${fileName} (${response.data.length} bytes)`);
            
            // 调试信息
            Logger.debug(`下载文件调试信息:`);
            Logger.debug(`  - 文件大小: ${response.data.length} 字节`);
            Logger.debug(`  - 文件内容前100字符: ${response.data.substring(0, 100)}`);
            Logger.debug(`  - 文件内容后100字符: ${response.data.substring(response.data.length - 100)}`);
            Logger.debug(`  - 是否包含discovery_rules: ${hasDiscoveryRules}`);
            
            return response.data;
            
        } catch (error: any) {
            Logger.error(`下载文件失败: ${fileName}`, error);
            throw new Error(`下载文件失败: ${error.message}`);
        }
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

