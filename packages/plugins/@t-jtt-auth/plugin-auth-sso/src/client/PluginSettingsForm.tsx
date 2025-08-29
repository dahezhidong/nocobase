/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { useMemo } from 'react';
import { App as AntdApp } from 'antd';
import { createForm } from '@formily/core';
import { useForm } from '@formily/react';
import { uid } from '@formily/shared';
import {
  ActionProps,
  ISchema,
  useCollection,
  useDataBlockResource,
  ExtendCollectionsProvider,
  SchemaComponent,
  useRequest,
} from '@nocobase/client';
import React from 'react';
import { usePluginSettingsFormRequest } from './PluginSettingsFormProvider';

interface TJttAuthSsoConfigurationFieldType {
  id: number;
  ssoApiUrl: string;
  clientId: string;
}

// 局部 URL 验证函数
const validateUrl = (value: string): string => {
  if (value === undefined || value === '') {
    return '';
  }
  const message = 'URL格式错误';
  try {
    const url = new URL(value);

    // 验证协议
    if (!['http:', 'https:'].includes(url.protocol)) {
      return message;
    }

    const host = url.hostname;

    // 验证 IP 地址
    const isIp = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(host);
    // 验证域名
    const isDomain = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(host);

    return isIp || isDomain ? '' : message;
  } catch (e) {
    return message;
  }
};

const tJttAuthSsoConfigurationCollection = {
  name: 'TJttAuthSsoConfiguration',
  filterTargetKey: 'id',
  fields: [
    {
      type: 'string',
      name: 'ssoApiUrl',
      interface: 'input',
      uiSchema: {
        type: 'string',
        title: '认证中心接口URL',
        'x-component': 'Input',
        'x-component-props': {},
        'x-validator': validateUrl,
      },
    },
    {
      type: 'string',
      name: 'clientId',
      interface: 'input',
      uiSchema: {
        title: '本系统客户端ID',
        'x-component': 'Input',
        'x-component-props': {},
      },
    },
  ],
};

const schema: ISchema = {
  type: 'void',
  name: uid(),
  'x-component': 'CardItem',
  'x-decorator': 'DataBlockProvider',
  'x-decorator-props': {
    collection: 'TJttAuthSsoConfiguration',
    action: 'get',
  },
  properties: {
    form: {
      type: 'void',
      'x-component': 'FormV2',
      'x-use-component-props': 'useFormBlockProps',
      properties: {
        ssoApiUrl: {
          title: '认证中心接口URL',
          'x-decorator': 'FormItem',
          'x-component': 'CollectionField',
          'x-validator': validateUrl,
        },
        clientId: {
          title: '本系统客户端ID',
          'x-decorator': 'FormItem',
          'x-component': 'CollectionField',
        },
        footer: {
          type: 'void',
          'x-component': 'Action',
          title: '保存',
          'x-use-component-props': 'useSubmitActionProps',
        },
      },
    },
  },
};

const useFormBlockProps = () => {
  // const { data, loading } = useRequest<{ data?: { ssoApiUrl: string; clientId: string } }>({
  //   url: 'TJttAuthSsoConfiguration:get',
  // });
  // const recordData = data?.data;

  const globalSettingsFormRequest = usePluginSettingsFormRequest();
  const recordData = globalSettingsFormRequest?.data?.data;
  const form = useMemo(
    () =>
      createForm({
        initialValues: recordData,
      }),
    [recordData],
  );

  return {
    form,
  };
};

const useSubmitActionProps = (): ActionProps => {
  const form = useForm();
  const { message } = AntdApp.useApp();
  const collection = useCollection();
  const resource = useDataBlockResource();
  const globalSettingsFormRequest = usePluginSettingsFormRequest();

  return {
    type: 'primary',
    htmlType: 'submit',
    async onClick() {
      await form.submit();
      const values = form.values;
      await resource.updateOrCreate({
        values,
        filterKeys: [collection.filterTargetKey],
      });
      await globalSettingsFormRequest.runAsync();
      message.success('保存成功!');
    },
  };
};

export const PluginSettingsForm = () => {
  return (
    <ExtendCollectionsProvider collections={[tJttAuthSsoConfigurationCollection]}>
      <SchemaComponent schema={schema} scope={{ useFormBlockProps, useSubmitActionProps }} />
    </ExtendCollectionsProvider>
  );
};