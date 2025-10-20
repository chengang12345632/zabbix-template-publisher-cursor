import * as vscode from 'vscode';

/**
 * 日志工具类
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;

    /**
     * 初始化日志通道
     */
    static initialize(context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Zabbix Template Publisher');
        context.subscriptions.push(this.outputChannel);
    }

    /**
     * 显示输出面板
     */
    static show() {
        this.outputChannel.show();
    }

    /**
     * 记录信息日志
     */
    static info(message: string, ...args: any[]) {
        const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
        const formattedMessage = `[${timestamp}] [INFO] ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        if (args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
            });
        }
        
        // 同时输出到控制台
        console.log(formattedMessage, ...args);
    }

    /**
     * 记录成功日志
     */
    static success(message: string, ...args: any[]) {
        const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
        const formattedMessage = `[${timestamp}] [SUCCESS] ✅ ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        if (args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
            });
        }
        
        console.log(formattedMessage, ...args);
    }

    /**
     * 记录警告日志
     */
    static warn(message: string, ...args: any[]) {
        const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
        const formattedMessage = `[${timestamp}] [WARN] ⚠️ ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        if (args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
            });
        }
        
        console.warn(formattedMessage, ...args);
    }

    /**
     * 记录错误日志
     */
    static error(message: string, error?: any) {
        const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
        const formattedMessage = `[${timestamp}] [ERROR] ❌ ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        if (error) {
            if (error instanceof Error) {
                this.outputChannel.appendLine(`错误详情: ${error.message}`);
                if (error.stack) {
                    this.outputChannel.appendLine(`堆栈跟踪:\n${error.stack}`);
                }
            } else {
                this.outputChannel.appendLine(`错误详情: ${JSON.stringify(error, null, 2)}`);
            }
        }
        
        console.error(formattedMessage, error);
    }

    /**
     * 分隔线
     */
    static separator() {
        this.outputChannel.appendLine('─'.repeat(80));
    }

    /**
     * 清空日志
     */
    static clear() {
        this.outputChannel.clear();
    }
}

