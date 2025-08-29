/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/server';
import TJttAuthSsoConfiguration from './collections/TJttAuthSsoConfiguration';
import axios from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';

export class PluginAuthSsoServer extends Plugin {
  // axios 实例
  request: any = null;
  // SSO 配置（存储 ssoApiUrl 和 clientId）
  ssoConfig: { ssoApiUrl: string; clientId: string } | null = null;

  async init() {
    // 初始化 axios 请求实例（含 HTTPS 证书配置）
    this.initRequest();

    // 监听 SSO 配置表的创建/更新事件，实时刷新配置
    this.app.db.on('TJttAuthSsoConfiguration.afterSave', async (model, options) => {
      this.app.logger.info('SSO: 监听配置表创建或更新数据事件');
      await this.refreshSsoConfig(model);
    });

    // 监听应用加载完成事件，初始化加载 SSO 配置
    this.app.on('afterLoad', async () => {
      this.app.logger.info('SSO: 监听应用加载事件');
      await this.refreshSsoConfig();
    });
  }

  /**
   * 初始化 axios 实例（配置超时、HTTPS Agent）
   */
  initRequest() {
    // axios 基础配置
    const axiosConfig: any = {
      timeout: 5000 // 请求超时时间：5秒
    };

    // 获取 HTTPS Agent（含证书配置，无证书则为 null）
    const httpsAgent = this.getHttpsAgent();
    if (httpsAgent) {
      axiosConfig.httpsAgent = httpsAgent;
    }

    // 创建 axios 实例并挂载到插件
    this.request = axios.create(axiosConfig);
  }

  /**
   * 构建 HTTPS Agent（处理证书加载，支持环境变量自定义证书目录）
   * @returns {https.Agent|null} HTTPS Agent 实例（失败则返回 null）
   */
  getHttpsAgent() {
    try {
      // 1. 解析证书目录（环境变量优先，无则用默认目录）
      const pluginRoot = path.resolve(__dirname, '../');  // 插件根目录src或dist
      this.app.logger.info('SSO: 插件根目录'+'[' + pluginRoot + ']');
      const envCertDir = process.env.T_JTT_AUTH_SSO_HTTPS_CERT_DIR; // 环境变量：用户自定义证书目录
      const certDir = envCertDir 
        ? path.resolve(envCertDir) // 环境变量目录 -> 转为绝对路径
        : path.join(pluginRoot, 'certificates'); // 默认目录：插件根目录/certificates

      this.app.logger.info('SSO: HTTPS证书目录', { certDir, fromEnv: !!envCertDir });

      // 2. 检查证书目录是否存在（不存在则跳过证书配置）
      if (!fs.existsSync(certDir)) {
        this.app.logger.warn('SSO: HTTPS证书目录不存在，跳过证书配置', { certDir });
        return null;
      }

      // 3. 读取目录文件，筛选目标证书（.crt 证书、.csr 请求文件、.key 私钥）
      const files = fs.readdirSync(certDir); // 同步读取（初始化阶段无并发问题）
      const certFiles = {
        crt: files.find(file => path.extname(file).toLowerCase() === '.crt'), // 证书文件（必需）
        csr: files.find(file => path.extname(file).toLowerCase() === '.csr'), // 证书请求文件（可选）
        key: files.find(file => path.extname(file).toLowerCase() === '.key')  // 私钥文件（必需）
      };

      // 4. 校验必需证书文件（.crt 和 .key 必须存在）
      if (!certFiles.crt || !certFiles.key) {
        this.app.logger.warn('SSO: 证书目录下缺少必需的证书文件（.crt或.key）', {
          certDir,
          foundFiles: certFiles,
          required: '.crt (证书文件) 和 .key (私钥文件)'
        });
        return null;
      }

      // 5. 读取证书文件内容（同步读取，确保初始化阶段加载完成）
      const certPath = path.join(certDir, certFiles.crt);
      const keyPath = path.join(certDir, certFiles.key);
      const csrPath = certFiles.csr ? path.join(certDir, certFiles.csr) : null;

      const certContent = fs.readFileSync(certPath, 'utf8');
      const keyContent = fs.readFileSync(keyPath, 'utf8');
      const csrContent = csrPath ? fs.readFileSync(csrPath, 'utf8') : null;

      this.app.logger.info('SSO: 成功加载HTTPS证书文件', {
        certPath,
        keyPath,
        csrPath: csrPath || '未配置'
      });

      // 6. 创建 HTTPS Agent 实例（用于 axios 发起 HTTPS 请求）
      const httpsAgent = new https.Agent({
        cert: certContent,       // 客户端证书
        key: keyContent,         // 客户端私钥
        ...(csrContent && { csr: csrContent }), // 可选：证书请求文件
        rejectUnauthorized: false // 开发环境关闭（避免自签证书报错），生产环境需改为 true
      });

      return httpsAgent;

    } catch (error) {
      // 捕获证书配置异常，不阻断插件运行
      this.app.logger.error('SSO: HTTPS证书配置错误', {
        errorMessage: error.message,
        stack: error.stack // 调试用（生产环境可移除）
      });
      return null;
    }
  }

  /**
   * 从数据库获取 SSO 配置（查询配置表第一条记录）
   * @returns {Promise<{ssoApiUrl: string; clientId: string}|null>} SSO 配置
   */
  async getSsoConfig() {
    // 注册 SSO 配置集合到数据库
    this.db.collection(TJttAuthSsoConfiguration);
    // 获取配置表的仓库实例
    const repository = this.db.getRepository('TJttAuthSsoConfiguration');
    // 查询第一条配置记录（默认取最新配置）
    const config = await repository.findOne();
    return config;
  }

  /**
   * 刷新 SSO 配置（支持传入已有配置，无则从数据库拉取）
   * @param {any} config - 已有配置（可选）
   */
  async refreshSsoConfig(config = undefined) {
    // 无传入配置时，从数据库获取
    config = config ?? await this.getSsoConfig();
    // 更新插件的 SSO 配置（空配置设为 null）
    this.ssoConfig = config || null;
    this.app.logger.info('SSO: 参数配置完成', this.ssoConfig);
  }

  async afterAdd() {}

  async beforeLoad() {
    // 加载前初始化插件（初始化请求实例、监听事件）
    await this.init();
  }

  async load() {
    // 1. 配置权限（允许公开访问 SSO 相关接口和配置查询）
    this.app.acl.allow('PluginAuthSso', '*', 'public');
    this.app.acl.allow('TJttAuthSsoConfiguration', 'get', 'public');

    // 2. 注册 SSO 相关接口（资源名：PluginAuthSso）
    this.app.resource({
      name: 'PluginAuthSso',
      actions: {
        /**
         * 接口1：获取认证中心登录页 URL
         * 请求路径：/PluginAuthSso:getAuthPageInfo
         */
        getAuthPageInfo: async (ctx, next) => {
          this.app.logger.info('SSO: 开始获取认证中心登录页URL');

          // 确保 SSO 配置已加载
          if (!this.ssoConfig) {
            await this.refreshSsoConfig();
          }

          // 配置缺失：返回错误
          if (!this.ssoConfig) {
            const errorMsg = 'SSO: 配置参数缺失,无法向认证中心发起请求';
            this.app.logger.error(errorMsg);
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {}
            };
            return;
          }

          // 构建请求参数（调用认证中心接口）
          const ssoPageConfig = {
            url: `${this.ssoConfig.ssoApiUrl}/system/config/getSsoPageInfo`,
            params: {
              clientId: this.ssoConfig.clientId
            }
          };

          try {
            // 发起请求获取登录页 URL
            const ssoPageResponse = await this.request.get(ssoPageConfig.url, {
              params: ssoPageConfig.params
            });

            // 认证中心返回非成功状态（code != 200）
            if (ssoPageResponse.data.code !== 200) {
              const errorMsg = 'SSO: 获取认证中心登录页URL失败';
              this.app.logger.error(errorMsg, {
                in: ssoPageConfig,
                out: ssoPageResponse.data
              });
              ctx.body = {
                success: false,
                message: errorMsg,
                data: {
                  in: ssoPageConfig,
                  out: ssoPageResponse.data
                }
              };
              return;
            }

            // 成功：返回 SSO 配置和登录页 URL
            const data = {
              ssoApiUrl: this.ssoConfig.ssoApiUrl,
              clientId: this.ssoConfig.clientId,
              ssoAuthPageUrl: ssoPageResponse.data.data
            };

            ctx.body = {
              success: true,
              message: 'SSO: 获取认证中心登录页URL成功',
              data: data
            };
            this.app.logger.info('SSO: 获取认证中心登录页URL成功', data);

          } catch (error) {
            // 请求异常：捕获并返回错误信息
            const errorMsg = 'SSO: 获取认证中心登录页URL失败';
            this.app.logger.error(errorMsg, {
              in: ssoPageConfig,
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: ssoPageConfig,
                out: error.message
              }
            };
            return;
          }

          await next();
        },

        /**
         * 接口2：通过 Ticket 换取 Token 并完成登录
         * 请求路径：/PluginAuthSso:doLoginByTicket
         */
        doLoginByTicket: async (ctx, next) => {
          this.app.logger.info('SSO: 开始使用ticket换取认证中心登录token');

          // 1. 从请求参数获取 Ticket（认证中心重定向携带）
          const { ticket } = ctx.query;
          if (!ticket) {
            const errorMsg = 'SSO: 请求缺少ticket参数';
            this.app.logger.error(errorMsg);
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {}
            };
            return;
          }

          // 2. 确保 SSO 配置已加载
          if (!this.ssoConfig) {
            await this.refreshSsoConfig();
          }
          if (!this.ssoConfig) {
            const errorMsg = 'SSO: 配置参数缺失,无法向认证中心发起请求';
            this.app.logger.error(errorMsg);
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {}
            };
            return;
          }

          let ssoToken: string; // 认证中心返回的 Token
          let ssoUser: any;     // 认证中心返回的用户信息
          let nocobaseUser: any; // NoCodeBase 平台用户
          let nocobaseToken: string; // NoCodeBase 登录 Token

          // 3. 第一步：用 Ticket 换取 SSO Token
          const tokenConfig = {
            url: `${this.ssoConfig.ssoApiUrl}/auth/sso/doLoginByTicket`,
            params: {
              ticket: ticket,
              clientId: this.ssoConfig.clientId
            }
          };

          try {
            const tokenResponse = await this.request.get(tokenConfig.url, {
              params: tokenConfig.params
            });

            if (tokenResponse.data.code !== 200) {
              const errorMsg = 'SSO: 使用ticket换取认证中心登录token失败';
              this.app.logger.error(errorMsg, {
                in: tokenConfig,
                out: tokenResponse.data
              });
              ctx.body = {
                success: false,
                message: errorMsg,
                data: {
                  in: tokenConfig,
                  out: tokenResponse.data
                }
              };
              return;
            }

            ssoToken = tokenResponse.data.data.token;
            this.app.logger.info('SSO: 使用ticket换取认证中心登录token成功');

          } catch (error) {
            const errorMsg = 'SSO: 使用ticket换取认证中心登录token失败';
            this.app.logger.error(errorMsg, {
              in: tokenConfig,
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: tokenConfig,
                out: error.message
              }
            };
            return;
          }

          // 4. 第二步：用 SSO Token 获取用户信息
          this.app.logger.info('SSO: 开始获取认证中心用户信息');
          const userConfig = {
            url: `${this.ssoConfig.ssoApiUrl}/system/user/getInfo`,
            headers: {
              Authorization: `${ssoToken}` // Token 放在 Authorization 头
            }
          };

          try {
            const userResponse = await this.request.get(userConfig.url, {
              headers: userConfig.headers
            });

            if (userResponse.data.code !== 200) {
              const errorMsg = 'SSO: 获取认证中心用户信息失败';
              this.app.logger.error(errorMsg, {
                in: userConfig,
                out: userResponse.data
              });
              ctx.body = {
                success: false,
                message: errorMsg,
                data: {
                  in: userConfig,
                  out: userResponse.data
                }
              };
              return;
            }

            ssoUser = userResponse.data.data.user;
            this.app.logger.info('SSO: 获取认证中心用户信息成功');

          } catch (error) {
            const errorMsg = 'SSO: 获取认证中心用户信息失败';
            this.app.logger.error(errorMsg, {
              in: userConfig,
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: userConfig,
                out: error.message
              }
            };
            return;
          }

          // 5. 处理特殊登录场景（type=username：用环境变量默认用户登录）
          let nonNocobseUser = ssoUser;
          const { type } = ctx.query;
          if (type === 'username') {
            const defaultUserName = process.env.T_JTT_AUTH_SSO_DEFAULT_USERNAME ?? 'admin-gly';
            if (defaultUserName) {
              this.app.logger.info('SSO: 获取配置的默认用户信息成功');
              nonNocobseUser = { userName: defaultUserName };
            } else {
              const errorMsg = 'SSO: 获取配置的用户信息失败，请在环境变量中配置 T_JTT_AUTH_SSO_DEFAULT_USERNAME';
              this.app.logger.error(errorMsg);
              ctx.body = {
                success: false,
                message: errorMsg
              };
              return;
            }
          }

          // 6. 第三步：查询 NoCodeBase 平台用户（匹配邮箱/用户名/用户ID）
          this.app.logger.info('SSO: 开始获取低代码平台用户信息');
          const { userId = '', userName = '', email = '', nickName = '' } = nonNocobseUser;
          const userIdStr = String(userId); // 确保用户ID为字符串类型

          try {
            const usersRepository = this.db.getRepository('users');
            nocobaseUser = await usersRepository.findOne({
              filter: {
                $or: [
                  { email: email },    // 按邮箱匹配
                  { username: userName }, // 按用户名匹配
                  { username: userIdStr }    // 按用户ID匹配
                ]
              }
            });

            // 平台无此用户：返回错误（注释部分为“自动创建用户”逻辑，如需启用可解除注释）
            if (!nocobaseUser) {
              const errorMsg = 'SSO: 低代码平台不存在该用户';
              this.app.logger.error(errorMsg);
              ctx.body = {
                success: false,
                message: errorMsg
              };
              return;
            }

            this.app.logger.info('SSO: 获取低代码平台用户信息成功');

          } catch (error) {
            const errorMsg = 'SSO: 获取低代码平台用户信息失败';
            this.app.logger.error(errorMsg, {
              in: { userName, email, nickName },
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: { userName, email, nickName },
                out: error.message
              }
            };
            return;
          }

          // 7. 第四步：生成 NoCodeBase 登录 Token（完成登录）
          this.app.logger.info('SSO: 开始低代码平台登录');
          try {
            nocobaseToken = await ctx.auth.signNewToken(nocobaseUser.id);
            this.app.logger.info('SSO: 低代码平台登录成功');

          } catch (error) {
            const errorMsg = 'SSO: 低代码平台登录失败';
            this.app.logger.error(errorMsg, {
              in: { userName, email, nickName },
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: { userName, email, nickName },
                out: error.message
              }
            };
            return;
          }

          // 登录成功：返回用户信息和双 Token（SSO Token + 平台 Token）
          this.app.logger.info('SSO: 单点登录成功');
          ctx.body = {
            success: true,
            message: '单点登录成功',
            data: {
              user: nocobaseUser,
              ssoToken: ssoToken,
              nocobaseToken: nocobaseToken
            }
          };

          await next();
        },

        /**
         * 接口3：单点注销（同步注销认证中心和平台登录状态）
         * 请求路径：/PluginAuthSso:doLogout
         */
        doLogout: async (ctx, next) => {
          this.app.logger.info('SSO: 开始单点注销');

          // 1. 从请求头获取 SSO Token（大小写兼容：X-Sso-Token 或 x-sso-token）
          const ssoToken = ctx.headers['X-Sso-Token'] ?? ctx.headers['x-sso-token'];

          // 2. 确保 SSO 配置已加载
          if (!this.ssoConfig) {
            await this.refreshSsoConfig();
          }

          // Token 缺失：返回错误
          if (!ssoToken) {
            const errorMsg = 'SSO: 请求头缺少X-Sso-Token参数,单点注销失败';
            this.app.logger.error(errorMsg);
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {}
            };
            return;
          }

          // 配置缺失：返回错误
          if (!this.ssoConfig) {
            const errorMsg = 'SSO: 配置参数缺失, 无法向认证中心发起请求';
            this.app.logger.error(errorMsg);
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {}
            };
            return;
          }

          // 3. 第一步：调用认证中心注销接口
          const signOutConfig = {
            url: `${this.ssoConfig.ssoApiUrl}/auth/sso/signout?clientId=${this.ssoConfig.clientId}`,
            headers: {
              Authorization: `${ssoToken}`
            }
          };

          try {
            const ssoSignoutResponse = await this.request.get(signOutConfig.url, {
              headers: signOutConfig.headers
            });

            if (ssoSignoutResponse.data.code !== 200) {
              const errorMsg = 'SSO: 认证中心注销失败';
              this.app.logger.error(errorMsg, {
                in: signOutConfig,
                out: ssoSignoutResponse.data
              });
              ctx.body = {
                success: false,
                message: errorMsg,
                data: {
                  in: signOutConfig,
                  out: ssoSignoutResponse.data
                }
              };
              return;
            }

            this.app.logger.info('SSO: 认证中心注销成功');

          } catch (error) {
            const errorMsg = 'SSO: 认证中心注销失败';
            this.app.logger.error(errorMsg, {
              in: signOutConfig,
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                in: signOutConfig,
                out: error.message
              }
            };
            return;
          }

          // 4. 第二步：清除 NoCodeBase 平台登录状态
          try {
            await ctx.auth.signOut();
            this.app.logger.info('SSO: 低代码平台注销成功');

          } catch (error) {
            const errorMsg = 'SSO: 低代码平台注销失败';
            this.app.logger.error(errorMsg, {
              in: signOutConfig,
              out: error.message
            });
            ctx.body = {
              success: false,
              message: errorMsg,
              data: {
                out: error.message
              }
            };
            return;
          }

          // 注销成功：返回结果
          ctx.body = {
            success: true,
            message: '单点注销成功',
            data: {}
          };

          await next();
        }
      }
    });
  }

  async install() {}

  async afterEnable() {}

  async afterDisable() {}

  async remove() {}
}

export default PluginAuthSsoServer;