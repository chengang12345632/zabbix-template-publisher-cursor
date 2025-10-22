import * as vscode from 'vscode';

/**
 * 日志级别枚举
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

/**
 * 日志工具类
 */
export class Logger {
    private static outputChannel: vscode.OutputChannel;
    private static currentLogLevel: LogLevel = LogLevel.INFO;

    /**
     * 初始化日志通道
     */
    static initialize(context: vscode.ExtensionContext) {
        this.outputChannel = vscode.window.createOutputChannel('Zabbix Template Publisher');
        context.subscriptions.push(this.outputChannel);
        
        // 从配置中读取日志级别
        const config = vscode.workspace.getConfiguration('zabbix-template-publisher');
        const logLevel = config.get<string>('logLevel', 'info').toLowerCase();
        switch (logLevel) {
            case 'debug':
                this.currentLogLevel = LogLevel.DEBUG;
                break;
            case 'info':
                this.currentLogLevel = LogLevel.INFO;
                break;
            case 'warn':
                this.currentLogLevel = LogLevel.WARN;
                break;
            case 'error':
                this.currentLogLevel = LogLevel.ERROR;
                break;
            default:
                this.currentLogLevel = LogLevel.INFO;
        }
    }

    /**
     * 设置日志级别
     */
    static setLogLevel(level: LogLevel) {
        this.currentLogLevel = level;
    }

    /**
     * 检查是否应该输出日志
     */
    private static shouldLog(level: LogLevel): boolean {
        return level >= this.currentLogLevel;
    }

    /**
     * 显示输出面板
     */
    static show() {
        this.outputChannel.show();
    }

    /**
     * 记录调试日志
     */
    static debug(message: string, ...args: any[]) {
        if (!this.shouldLog(LogLevel.DEBUG)) return;
        
        const timestamp = new Date().toLocaleString('zh-CN', { hour12: false });
        const formattedMessage = `[${timestamp}] [DEBUG] ${message}`;
        this.outputChannel.appendLine(formattedMessage);
        
        if (args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
            });
        }
        
        console.log(formattedMessage, ...args);
    }

    /**
     * 记录信息日志
     */
    static info(message: string, ...args: any[]) {
        if (!this.shouldLog(LogLevel.INFO)) return;
        
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
        if (!this.shouldLog(LogLevel.INFO)) return;
        
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
        if (!this.shouldLog(LogLevel.WARN)) return;
        
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
        if (!this.shouldLog(LogLevel.ERROR)) return;
        
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

