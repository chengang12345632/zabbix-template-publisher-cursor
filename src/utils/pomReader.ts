import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * POM文件读取器
 */
export class PomReader {
    
    /**
     * 从pom.xml读取artifactId和version
     */
    public static async readPomInfo(workspaceFolder: vscode.WorkspaceFolder): Promise<{
        artifactId?: string;
        version?: string;
    }> {
        const pomPath = path.join(workspaceFolder.uri.fsPath, 'pom.xml');
        
        if (!fs.existsSync(pomPath)) {
            return {};
        }

        try {
            const content = fs.readFileSync(pomPath, 'utf-8');
            
            const artifactIdMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
            const versionMatch = content.match(/<version>([^<]+)<\/version>/);
            
            return {
                artifactId: artifactIdMatch ? artifactIdMatch[1] : undefined,
                version: versionMatch ? versionMatch[1] : undefined
            };
        } catch (error) {
            console.error('读取pom.xml失败:', error);
            return {};
        }
    }

    /**
     * 从文件路径推断服务名称
     * 例如: alarm-service_zabbix_template.properties -> alarm-service
     */
    public static inferServiceName(filePath: string): string | undefined {
        const fileName = path.basename(filePath);
        const match = fileName.match(/^(.+?)_zabbix_template\.properties$/);
        return match ? match[1] : undefined;
    }

    /**
     * 检查文件名是否为主监控项模板（包含master关键字）
     */
    public static isMasterTemplate(filePath: string): boolean {
        const fileName = path.basename(filePath).toLowerCase();
        return fileName.includes('master') && fileName.endsWith('_zabbix_template.properties');
    }
}

