/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import './style.css';
import { useApp, useRequest } from '@nocobase/client';
import { message } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

// 定义响应数据类型
interface ResponseData {
  success: boolean;
  message?: string;
}

export const SsoLogout = () => {
  const app = useApp();
  const navigate = useNavigate();
  const { run } = useRequest<ResponseData>(
    {
      url: 'PluginAuthSso:doLogout',
      method: 'get',
      headers: {
        Authorization: `Bearer ${app.apiClient.auth.getToken()}`,
        'X-Sso-Token': app.apiClient.storage.getItem('SSO_TOKEN') ?? '',
      },
    },
    {
      manual: true,
      onSuccess: (res) => {
        if (res.data.success) {
          message.success('注销成功');
          navigate('/sso-login');
        } else {
          message.error('注销失败');
          navigate('/sso-exception', {
            state: { error: `注销失败`, code: 500, backPath: '/' },
          });
        }
      },
      onError: (error: Error) => {
        // 即使请求失败，也清除本地 token
        app.apiClient.auth.setToken(null);
        // 清除 SSO token
        app.apiClient.storage.removeItem('SSO_TOKEN');
        console.error(`注销失败`, error);
        navigate('/sso-exception', {
          state: {
            error: `注销失败: ${error instanceof Error ? error.message : '未知错误'}`,
            code: 500,
            backPath: '/',
          },
        });
      },
      onFinally: () => {
        // 清除 nocobase token
        app.apiClient.auth.setToken(null);
        // 清除 SSO token
        app.apiClient.storage.removeItem('SSO_TOKEN');
      },
    },
  );

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div id="loader-wrapper">
      <div id="loader"></div>
      <div className="loader-section section-left"></div>
      <div className="loader-section section-right"></div>
      <div className="load_title">正在注销，请耐心等待</div>
    </div>
  );
};
