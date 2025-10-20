# 配置参数参考手册

## 插件配置项

### NextCloud配置

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `nextcloud.url` | String | 是 | - | NextCloud服务器地址 |
| `nextcloud.username` | String | 是 | - | NextCloud用户名 |
| `nextcloud.password` | String | 是 | - | NextCloud应用专用密码 |
| `nextcloud.templateBasePath` | String | 否 | `/云平台开发部/监控模板` | 模板存储根路径 |
| `nextcloud.webdavUsername` | String | 否 | - | WebDAV文件空间用户名（如果与登录用户名不同）|

### 项目配置

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `project.serviceName` | String | 否 | 从pom.xml读取 | 服务名称，用于文件命名 |
| `project.version` | String | 否 | 从pom.xml读取 | 版本号，用于版本目录命名 |

### Zabbix配置

| 配置项 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| `zabbix.url` | String | 否 | - | Zabbix服务器地址（例如：https://zabbix.example.com/zabbix）|
| `zabbix.username` | String | 否 | - | Zabbix用户名 |
| `zabbix.password` | String | 否 | - | Zabbix密码 |

**注意事项：**
- SSL证书验证已自动禁用，支持自签名证书
- 超时时间固定为30秒
- 这是可选配置，如不配置则只上传到NextCloud，不导入到Zabbix

## Zabbix配置参数详解

### 监控项类型 (type)

| 类型 | 说明 | 适用场景 | 主要特点 |
|------|------|---------|---------|
| `ZABBIX_ACTIVE` | Zabbix主动检查 | 主监控项，获取Prometheus数据 | 减轻server负载，适合大规模监控 |
| `DEPENDENT` | 依赖项 | 业务监控项、发现规则 | 从主监控项提取数据，需配置`master_item` |
| `ZABBIX_PASSIVE` | Zabbix被动检查 | 简单agent监控 | Server定期轮询agent |
| `HTTP_AGENT` | HTTP代理 | HTTP/HTTPS接口监控 | 支持REST API监控 |
| `SIMPLE` | 简单检查 | 网络连通性检查 | 如ICMP ping |
| `SNMP` | SNMP协议 | 网络设备监控 | 标准网络设备监控 |
| `INTERNAL` | 内部检查 | Zabbix自身状态 | 监控Zabbix性能 |
| `EXTERNAL` | 外部脚本 | 自定义脚本监控 | 执行外部脚本 |

### 数据值类型 (value_type)

| 类型 | 说明 | 适用场景 | 特点 |
|------|------|---------|------|
| `FLOAT` | 浮点数（推荐） | 大多数业务指标 | 支持小数，范围广，精度高 |
| `UNSIGNED` | 无符号整数 | 正整数计数器 | 范围：0 到 2^64-1 |
| `TEXT` | 文本 | 主监控项存储原始数据 | 不支持趋势存储 |
| `CHAR` | 字符 | 短文本、状态码 | 最多255字符 |
| `LOG` | 日志 | 日志文件监控 | 支持日志分析和告警 |

### 预处理类型 (preprocessing_type)

| 类型 | 功能 | 适用场景 | 配置示例 |
|------|------|---------|---------|
| `PROMETHEUS_PATTERN` | Prometheus模式匹配 | 业务监控项，提取单个指标值 | `metric_name{label="value"}` |
| `PROMETHEUS_TO_JSON` | Prometheus转JSON | 发现规则，LLD低级别发现 | `metric_name{}` |
| `JSONPATH` | JSON路径提取 | 解析JSON监控数据 | `$.data.value` |
| `REGEX` | 正则表达式提取 | 从文本提取内容 | `pattern\noutput` |
| `MULTIPLIER` | 乘法器 | 单位转换 | `0.001` (毫秒转秒) |
| `TRIM` | 去除空白字符 | 文本数据清理 | - |
| `JAVASCRIPT` | JavaScript脚本 | 复杂数据处理 | 自定义脚本 |

## 监控项配置要点

> ⚠️ **重要架构说明**：采用"主从分离架构"，主监控项由运维统一维护到NextCloud，各组件只需配置业务监控项。

### 主监控项配置（仅供参考）

**维护说明**：主监控项模板由运维管理人员统一维护到NextCloud，各组件项目中**无需创建**此文件。

**参考示例**：[master_prometheus_business_template.properties](examples/master_prometheus_business_template.properties)

```properties
# 主监控项（唯一的Prometheus数据拉取入口）
# 此配置由运维管理人员维护，各组件无需关注
zabbix.items[0].name="master-prometheus-metadata"
zabbix.items[0].key="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].type="ZABBIX_ACTIVE"
zabbix.items[0].value_type="TEXT"
zabbix.items[0].delay="5m"
zabbix.items[0].appName="Prometheus"
```

**配置说明**：
- **type**: 使用 `ZABBIX_ACTIVE`（主动检查）
- **value_type**: 设置为 `TEXT`（存储原始Prometheus数据）
- **key**: 固定为 `master.prometheus[{$EXPORTTOOL_URL}]`
- **delay**: 采集频率，默认5分钟
- **不需要配置预处理**

### 业务监控项配置（各组件维护）

**文件路径**：`src/main/resources/zabbix/{serviceName}_business_template.properties`  
**文件名说明**：serviceName从pom.xml的artifactId自动读取，如：`base_alarm_service_business_template.properties`  
**维护说明**：各组件项目需要创建和维护此文件，配置本组件的业务监控项

```properties
# 业务监控项
zabbix.items[0].name="告警证据下载成功量"
zabbix.items[0].key="alarm_evidence_download_success"
zabbix.items[0].type="DEPENDENT"
zabbix.items[0].value_type="FLOAT"
zabbix.items[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.items[0].preprocessing_type="PROMETHEUS_PATTERN"
zabbix.items[0].preprocessing_params="alarm_evidence_download{taskStatus=\"success\"}"
zabbix.items[0].appName="alarm"
```

**配置说明**：
- **type**: 使用 `DEPENDENT`（依赖项）
- **master_item**: 必须引用主监控项key：`master.prometheus[{$EXPORTTOOL_URL}]`
- **preprocessing_type**: 使用 `PROMETHEUS_PATTERN`（提取指标值）
- **键值必须与Prometheus指标名称完全一致**

### 发现规则配置

```properties
# 发现规则
zabbix.discovery_rules[0].name="告警业务监控发现"
zabbix.discovery_rules[0].key="alarm_business.discovery"
zabbix.discovery_rules[0].type="DEPENDENT"
zabbix.discovery_rules[0].master_item="master.prometheus[{$EXPORTTOOL_URL}]"
zabbix.discovery_rules[0].preprocessing_type="PROMETHEUS_TO_JSON"
zabbix.discovery_rules[0].preprocessing_params="alarm_business_info{}"
zabbix.discovery_rules[0].lld_macros="APPID,TENANTID"
zabbix.discovery_rules[0].appName="alarm"
zabbix.discovery_rules[0].item_prototype.name="告警业务监控:[appId:{#APPID}] [租户:{#TENANTID}]"
zabbix.discovery_rules[0].item_prototype.key="alarm_business[{#APPID},{#TENANTID}]"
```

**配置说明**：
- **type**: 使用 `DEPENDENT`
- **master_item**: 必须引用主监控项：`master.prometheus[{$EXPORTTOOL_URL}]`
- **键值必须以 `.discovery` 结尾**
- **preprocessing_type**: 使用 `PROMETHEUS_TO_JSON`
- **lld_macros**: 定义要提取的标签维度
- **item_prototype**: 定义监控项原型，使用 `{#宏名}` 引用标签值

## 支持的模板元素

| 元素类型 | 说明 | 配置前缀 |
|---------|------|---------|
| 模板基本信息 | template、name、version、date | `zabbix.template` |
| 模板组 | 模板分组管理 | `zabbix.groups[n]` |
| 应用 | 监控项分类 | `zabbix.applications[n]` |
| 宏定义 | 可重用变量 | `zabbix.macros[n]` |
| 监控项 | 数据采集项 | `zabbix.items[n]` |
| 发现规则 | LLD低级别发现 | `zabbix.discovery_rules[n]` |
| 监控项原型 | 发现规则的监控项模板 | `zabbix.discovery_rules[n].item_prototype` |

## 配置示例文件

完整的配置示例请参考项目中的 `zabbix_template_example.properties` 文件。

