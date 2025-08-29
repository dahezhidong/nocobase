/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Button, Result } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

export const AppException = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Result
      status="500"
      title="500"
      subTitle={"抱歉, 系统出现异常"}
      extra={
        location?.state?.backPath ? (
          <Button
            onClick={() => navigate(location.state.backPath)}
            type="primary"
          >
            返回
          </Button>
        ) : (
          <Button onClick={() => navigate("/")} type="primary">
            首页
          </Button>
        )
      }
    />
  );
};
