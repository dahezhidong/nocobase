# @t-jtt-auth/plugin-auth-sso

# 1.每次运行nocobase 前安装
yarn nocobase install --lang=zh-CN

# 启动nocobase前启动数据库
## 数据库连接
 大小写混合的表名或字段需要使用双引号括起来
 psql.exe -h 127.0.0.1 -p 5432 -d nocobase -U nocobase -W nocobase  
 口令: nocobase
 set search_path to nocobase;  
 select * from pg_tables where tablename = 'TJttAuthSsoConfiguration';
 select * from "applicationPlugins" where "packageName" = '@t-jtt-auth/plugin-auth-sso'; 
 select * from "TJttAuthSsoConfiguration";

# 2.启动nocobase
yarn dev
或
yarn start

start使用的插件目录：
\t-nocobase\storage\plugins\@t-jtt-auth

dev使用的插件目录:
\t-nocobase\packages\plugins\@t-jtt-auth

### 插件服务端定义的请求映射
http://localhost:13001/api/PluginAuthSso:getAuthPageInfo  
http://localhost:13001/api/TJttAuthSsoConfiguration:get  
http://localhost:13001/api/PluginAuthSso:doLoginByTicket?ticket=xxx  
http://localhost:13001/api/PluginAuthSso:doLogout  

### 插件前端定义的路由
http://localhost:13000/sso-exception  
http://localhost:13000/sso-login  
http://localhost:13000/third-party-login  
http://localhost:13000/sso-user-login  
http://localhost:13000/sso-logout  


# 登录nocobase

# 3.创建插件, 创建之前先将源码拷贝到其他地方,创建完成,再将源码复制过来以避免覆盖
### 移除插件 

yarn pm create @t-jtt-auth/plugin-auth-sso  

在\t-nocobase\packages\plugins下创建插件

# 4.打包插件，生成dist目录, 添加--tar同时生成正式环境包
yarn build @t-jtt-auth/plugin-auth-sso
yarn build @t-jtt-auth/plugin-auth-sso --tar

# 5.注册插件
yarn pm add @t-jtt-auth/plugin-auth-sso

正式环境将上传的插件解压到storage\plugins，并在node_modules\@t-jtt-auth\目录下创建软链接
\t-nocobase\node_modules\@t-jtt-auth\plugin-auth-sso -> \t-nocobase\storage\plugins\@t-jtt-auth\plugin-auth-sso

# 6.激活插件，激活插件之前需要先打包, 会创建数据表, 会在applicationPlugins表中添加一条记录, 会生成一个配置表
yarn pm enable @t-jtt-auth/plugin-auth-sso

select * from "applicationPlugins" where "packageName" = '@t-jtt-auth/plugin-auth-sso'; 
select * from pg_tables where tablename = 'TJttAuthSsoConfiguration';

# 禁用插件
yarn pm disable @t-jtt-auth/plugin-auth-sso

# 删除插件, 删除插件之前需要备份源码
yarn pm remove @t-jtt-auth/plugin-auth-sso  
drop table "TJttAuthSsoConfiguration";  
del \t-nocobase\storage\plugins\@t-jtt-auth  
del \t-nocobase\node_modules\@t-jtt-auth\plugin-auth-sso 

# 7.数据库更新
yarn nocobase upgrade --skip-code-update


# chrome 调试 nodejs
yarn dev --inspect
chrome://inspect

https://github.com/alangpierce/sucrase/issues/583

# nocobase 源码
## 登录
\packages\plugins\@nocobase\plugin-auth\src\client\basic\SignInForm.tsx
useSignIn() 
\packages\core\sdk\src\APIClient.ts 
signIn() // 设置了token
'X-Authenticator': authenticator, // 设置认证方式(密码,短信等)

# 8.登录nocobase
http://localhost:13000
admin@nocobase.com/admin123
nocobase/admin123

# 9.在nocobase单点登录配置页中配置:
http://localhost:13000/admin/settings/@t-jtt-auth/plugin-auth-sso

认证中心接口URL: http://192.168.10.85:8080
本系统客户端ID: 5915ba4d1fa6c82b7369b89799b53742

# 10.nocobase 单点登录入口
http://localhost:13000/sso-login
### SsoLogin.tsx 获取到认证中心登录页后跳转到认证中心登录页, 需要先把门户系统启起来
http://localhost:8001/#/auth-login?redirect=http://localhost:13000/third-party-login&clientId=5915ba4d1fa6c82b7369b89799b53742
admin/HeQPTJX4jp

# 11 nocobase 固定账号登录入口, 通过配置文件配置账号username, 后端通过username获取userId直接登录系统
nocobase数据库中添加用户：
{
  username: 'xxx',
}  

.env中配置以下字段：  
########################## 综合交通信息门户 #######################################
############### [单点登录|@t-jtt-auth/plugin-auth-sso] ############################
# 单点登录默认用户名
T_JTT_AUTH_SSO_DEFAULT_USERNAME= 
# 单点登录nodejs 调用其他系统的接口可能需要使用https，https证书所在目录,默认使用 插件根目录/certificates/ 目录中的证书, 没找到则不支持https，请求时可能会报 self-signed certificate 异常
T_JTT_AUTH_SSO_HTTPS_CERT_DIR=

登录入口：
http://localhost:13000/sso-user-login  

# 开发环境使用start运行比较快
\t-nocobase
yarn start
yarn build @t-jtt-auth/plugin-auth-sso
Copy-Item -Path F:\t-nocobase\packages\plugins\@t-jtt-auth -Destination F:\t-nocobase\storage\plugins -Force -Recurse
yarn start
 
# 备份源码
Copy-Item -Path  F:\t-nocobase\packages\plugins\@t-jtt-auth  -Destination "E:\_work\自己的腾建科技\nocobase-plugins" -Recurse -Force 

# 恢复源码
Copy-Item -Path "E:\_work\自己的腾建科技\nocobase-plugins\plugin-auth-sso"  -Destination  F:\t-nocobase\packages\plugins  -Recurse -Force 

# 测试配置参数保存接口， 修改body中的ssoApiUrl、clientId
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:13000/api/TJttAuthSsoConfiguration:updateOrCreate?filterKeys[]=id" `
-Method "POST" `
-WebSession $session `
-Headers @{
"Accept"="application/json, text/plain, */*"
  "Accept-Encoding"="gzip, deflate, br, zstd"
  "Accept-Language"="zh-CN,zh;q=0.9"
  "Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRlbXAiOnRydWUsImlhdCI6MTc1NjQzMTg1NSwic2lnbkluVGltZSI6MTc1NjQzMTg1NTA2NSwiZXhwIjoxNzU2NTE4MjU1LCJqdGkiOiJkOGJjNmY1NS1mYTEzLTQ3YjAtOGRlYy03ZDE2NzVlNTI0OWIifQ.5gnDaP3afEci-Elq21Y-2_YFxoULdrSGrJeI4DbXYDw"
  "Cache-Control"="no-cache"
  "Origin"="http://localhost:13000"
  "Pragma"="no-cache"
  "Referer"="http://localhost:13000/admin/settings/@t-jtt-auth/plugin-auth-sso"
  "Sec-Fetch-Dest"="empty"
  "Sec-Fetch-Mode"="cors"
  "Sec-Fetch-Site"="same-origin"
  "X-Authenticator"="basic"
  "X-Hostname"="localhost"
  "X-Locale"="zh-CN"
  "X-Role"="root"
  "X-Timezone"="+08:00"
  "X-With-ACL-Meta"="true"
  "sec-ch-ua"="`"Google Chrome`";v=`"131`", `"Chromium`";v=`"131`", `"Not_A Brand`";v=`"24`""
  "sec-ch-ua-mobile"="?0"
  "sec-ch-ua-platform"="`"Windows`""
} `
-ContentType "application/json" `
-Body "{`"id`":1,`"createdAt`":`"2025-08-26T08:36:00.792Z`",`"updatedAt`":`"2025-08-29T01:44:31.435Z`",`"ssoApiUrl`":`"http://192.168.10.85:8082`",`"clientId`":`"5915ba4d1fa6c82b7369b89799b53742`"}"

# 交通厅环境
交通厅 172.16的系统
地址：[https://vpn.ynjtt.com/](https://vpn.ynjtt.com/) 
用户名：yczm
密码 YN_yw@jf*#32

ssoApiUrl：
https://172.17.204.238/prod-api
clientId：
cf26164a43ca85e920b3e7fdb7da9071