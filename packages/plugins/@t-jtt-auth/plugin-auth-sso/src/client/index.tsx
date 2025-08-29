/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/client';

// @ts-ignore
import { name } from '../../package.json';
import { SsoLogin } from './SsoLogin';
import { ThirdPartyLogin } from './ThirdPartyLogin';
import { SsoUserLogin } from './SsoUserLogin';
import { ThirdPartyUserLogin } from './ThirdPartyUserLogin';
import { SsoLogout } from './SsoLogout';
import { AppException } from './AppException';
import { PluginSettingsForm } from './PluginSettingsForm';
import { PluginSettingsFormProvider } from './PluginSettingsFormProvider';

export class PluginAuthSsoClient extends Plugin {
  async afterAdd() {}

  async beforeLoad() {}

  async load() {
    // 添加SSO登录路由
    this.router.add('sso-login', {
      path: '/sso-login',
      Component: SsoLogin,
      skipAuthCheck: true,
    });

    // 添加第三方登录路由
    this.router.add('third-party-login', {
      path: '/third-party-login',
      Component: ThirdPartyLogin,
      skipAuthCheck: true,
    });

    // 添加SSO注销路由
    this.router.add('sso-logout', {
      path: '/sso-logout',
      Component: SsoLogout,
      skipAuthCheck: true,
    });

    // 添加异常处理路由
    this.router.add('sso-exception', {
      path: '/sso-exception',
      Component: AppException,
      skipAuthCheck: true,
    });

    // 添加指定用户SSO登录路由
    this.router.add('sso-user-login', {
      path: '/sso-user-login',
      Component: SsoUserLogin,
      skipAuthCheck: true,
    });

    // 添加指定用户第三方登录路由
    this.router.add('third-party-user-login', {
      path: '/third-party-user-login',
      Component: ThirdPartyUserLogin,
      skipAuthCheck: true,
    });

    // 注册插件设置页面
    this.app.pluginSettingsManager.add(name, {
      title: '单点登录配置',
      icon: 'FormOutlined',
      Component: PluginSettingsForm,
    });

    // 全局使用插件设置数据
    this.app.addProvider(PluginSettingsFormProvider);
  }
}

export default PluginAuthSsoClient;
