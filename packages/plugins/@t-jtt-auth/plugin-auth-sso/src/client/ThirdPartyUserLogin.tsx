/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import './style.css';
import { useRequest, useCurrentUserContext } from '@nocobase/client';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '@nocobase/client';
import React from 'react';

// 定义响应数据类型
interface ResponseData {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      nickname: string;
      username: string;
      email: string;
    };
    ssoToken: string;
    nocobaseToken: string;
  };
}

export const ThirdPartyUserLogin = () => {
  const { refreshAsync } = useCurrentUserContext();

  const navigate = useNavigate();
  const app = useApp();
  const locationUrl = new URL(location.href);

  const ticket = locationUrl.searchParams.get('ticket');

  if (!ticket) {
    message.error('未获取到ticket');
    navigate('/sso-exception', { state: { error: '未获取到ticket', code: 500, backPath: '/sso-user-login' } });
  }

  // 响应示例:
  // {
  // "success": true,
  // "message": "SSO登录成功",
  // "user": {
  // "createdAt": "2025-08-22T03:14:30.610Z",
  // "updatedAt": "2025-08-22T03:14:30.610Z",
  // "id": 2,
  // "nickname": "管理员",
  // "username": "1",
  // "email": "xxx@163.com",
  // "phone": null,
  // "passwordChangeTz": null,
  // "appLang": null,
  // "systemSettings": {},
  // "createdById": null,
  // "updatedById": null
  // },
  // "ssoToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJsb2dpblR5cGUiOiJsb2dpbiIsImxvZ2luSWQiOiJzeXNfdXNlcjoxIiwicm5TdHIiOiJQd2x1aXE3SDJYVG9aRUk0bnJJdGhNY2lLNFpUZnd3OSIsImNsaWVudGlkIjoiMTcyZWVlNTRhYTY2NGU5ZGQwNTM2YjA2Mzc5NmU1NGUiLCJncmFudFR5cGUiOiJwYXNzd29yZCIsInRlbmFudElkIjoiMDAwMDAwIiwidXNlcklkIjoxLCJ1c2VyTmFtZSI6ImFkbWluIiwiZGVwdElkIjoxMDAsImRlcHROYW1lIjoi5LqR5Y2X55yB5Lqk6YCa6L-Q6L6T5Y6FIiwiZGVwdENhdGVnb3J5IjoiIn0.xeN8mGtYV16odxBJ6G1VY1TV0ETEp-EZPrcs_QGZ0EY",
  // "nocobaseToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInRlbXAiOnRydWUsImlhdCI6MTc1NTgzMjkxNywic2lnbkluVGltZSI6MTc1NTgzMjkxNzc5NSwiZXhwIjoxNzU1OTE5MzE3LCJqdGkiOiI0MjEwZDMwMC1lMGRiLTQ1YWItYWJjNS04ODIwZTEzOTEzZjgifQ.8_lKyKKXSLv7fDMLd1Sxw2dxrVwUD9zi3GkoQ7GUqKk"
  // }

  const { run } = useRequest<ResponseData>(
    {
      url: 'PluginAuthSso:doLoginByTicket',
      method: 'get',
      params: {
        ticket,
        type: 'username',
      },
    },
    {
      manual: true,
      onSuccess: async (res) => {
        if (res.data.success) {
          // 保存nocobase token
          app.apiClient.auth.setToken(res.data.data.nocobaseToken);

          // 保存SSO token到storage
          if (res.data.data.ssoToken) {
            app.apiClient.storage.setItem('SSO_TOKEN', res.data.data.ssoToken);
          }

          // 检查token, 设置用户信息
          await refreshAsync();
          message.success('登录成功');

          navigate('/'); // 跳转到首页
        } else {
          message.error(res.data.message || '登录失败，未获取到有效信息');
          navigate('/sso-exception', {
            state: { error: res.data.message || '登录失败，未获取到有效信息', code: 500, backPath: '/sso-user-login' },
          });
        }
      },
      onError: (error) => {
        console.error(`登录失败`, error);
        navigate('/sso-exception', {
          state: {
            error: `登录失败: ${error instanceof Error ? error.message : '未知错误'}`,
            code: 500,
            backPath: '/sso-user-login',
          },
        });
      },
    },
  );

  useEffect(() => {
    console.log('SSO: 使用ticket登录系统');
    run();
  }, [run]);

  return (
    <div id="loader-wrapper">
      <div id="loader"></div>
      <div className="loader-section section-left"></div>
      <div className="loader-section section-right"></div>
      <div className="load_title">正在登录中，请耐心等待</div>
    </div>
  );
};
