/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

/**
 * 从 URL 中获取查询参数（优先从 hash 中提取）
 * @param url URL
 * @param paramName 参数名
 * @returns 参数值 | null
 */
export function getSearchParam(url: URL | Location, paramName: string): string | null {
  const { search, hash } = url;

  // 先尝试从 hash 中提取
  if (hash.includes('?')) {
    const paramIndex = hash.indexOf('?');
    const hashSearch = hash.substring(paramIndex);
    const params = new URLSearchParams(hashSearch);
    return params.get(paramName);
  }

  // 否则从 search 中提取
  if (search) {
    const params = new URLSearchParams(search);
    return params.get(paramName);
  }

  return null;
}

/**
 * URL 中设置查询参数（优先设置 hash 后的）
 * @param url URL 对象或 location
 * @param paramName 参数名
 * @param paramValue 参数值
 */
export function setSearchParam(url: URL | Location, paramName: string, paramValue: string): void {
  let search = '';
  let hash = '';

  if (url instanceof URL) {
    search = url.search;
    hash = url.hash;
  } else {
    // 如果传入的是 Location 类型（如 window.location）
    search = url.search;
    hash = url.hash;
  }

  const hasHashQuery = hash.includes('?');
  const baseHash = hasHashQuery ? hash.split('?')[0] : hash;
  const hashQuery = hasHashQuery ? hash.split('?')[1] : '';

  const params = new URLSearchParams(hasHashQuery ? hashQuery : search);
  params.set(paramName, paramValue);
  const newParamsStr = params.toString();

  if (hasHashQuery || hash) {
    // 如果 hash 中有查询参数 或 hash 存在，则写入 hash
    if (url instanceof URL) {
      url.hash = `${baseHash}?${newParamsStr}`;
    } else {
      url.hash = `${baseHash}?${newParamsStr}`;
    }
  } else {
    // 否则写入 search
    if (url instanceof URL) {
      url.search = newParamsStr;
    } else {
      url.search = newParamsStr;
    }
  }
}
