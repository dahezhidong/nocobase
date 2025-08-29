/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import './style.css';
import { useRequest } from '@nocobase/client';
import { message } from 'antd';
import { setSearchParam } from '../utils/utils';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

// 定义响应数据类型
interface ResponseData {
  success: boolean;
  data?: {
    ssoApiUrl: string;
    clientId: string;
    ssoAuthPageUrl: string;
  };
  message?: string;
}

export const SsoLogin = () => {
  const navigate = useNavigate();
  const { run } = useRequest<ResponseData>(
    {
      url: 'PluginAuthSso:getAuthPageInfo',
      method: 'get',
    },
    {
      manual: true,
      onBefore: () => {},
      onSuccess: (res) => {
        if (res.data.success) {
          message.success(`获取认证中心登录URL成功`);

          const { clientId, ssoAuthPageUrl } = res.data.data;

          try {
            const redirectUrl = new URL('/third-party-login', location.origin);
            const authPageUrl = new URL(ssoAuthPageUrl);
            setSearchParam(authPageUrl, 'redirect', redirectUrl.href);
            setSearchParam(authPageUrl, 'clientId', clientId);

            location.replace(decodeURIComponent(authPageUrl.href));
          } catch (error) {
            message.error(`URL处理错误`, error.message);
          }
        } else {
          message.error(`获取认证中心登录URL失败`, res.data.message);
          navigate('/sso-exception', {
            state: {
              error: res.data.message,
              code: res.data.code,
              backPath: '/sso-login',
            },
          });
        }
      },
      onError: (error: Error) => {
        console.error(`获取认证中心登录URL失败`, error);
        navigate('/sso-exception', {
          state: {
            error: error.message,
            code: error.name,
            backPath: '/sso-login',
          },
        });
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
      <div className="load_title">正在跳转到认证中心，请耐心等待</div>
    </div>
  );
};
