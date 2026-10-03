/// <reference types="jest" />

import {
  coerceContentType,
  coerceFormat,
  formatsToCsv,
  parseResultsJson,
} from '../format';

describe('coerceFormat', () => {
  it('保留合法码制', () => {
    expect(coerceFormat('QR_CODE')).toBe('QR_CODE');
    expect(coerceFormat('EAN_13')).toBe('EAN_13');
    expect(coerceFormat('UNKNOWN')).toBe('UNKNOWN');
  });
  it('非法/非字符串收敛为 UNKNOWN', () => {
    expect(coerceFormat('NOPE')).toBe('UNKNOWN');
    expect(coerceFormat(123)).toBe('UNKNOWN');
    expect(coerceFormat(undefined)).toBe('UNKNOWN');
    expect(coerceFormat(null)).toBe('UNKNOWN');
  });
});

describe('coerceContentType', () => {
  it('保留合法内容类型', () => {
    expect(coerceContentType('URL')).toBe('URL');
    expect(coerceContentType('WIFI')).toBe('WIFI');
  });
  it('非法/缺省返回 undefined', () => {
    expect(coerceContentType('NOPE')).toBeUndefined();
    expect(coerceContentType(undefined)).toBeUndefined();
  });
});

describe('formatsToCsv', () => {
  it('空/未传 → 空串（= 全部码制）', () => {
    expect(formatsToCsv()).toBe('');
    expect(formatsToCsv([])).toBe('');
  });
  it('多个码制 → 逗号分隔', () => {
    expect(formatsToCsv(['QR_CODE', 'EAN_13'])).toBe('EAN_13,QR_CODE');
  });
});

describe('parseResultsJson', () => {
  it('解析合法 JSON 数组', () => {
    const json = JSON.stringify([
      {
        value: '6925303773908',
        format: 'EAN_13',
        contentType: 'ARTICLE',
        cornerPoints: [{ x: 1, y: 2 }],
      },
    ]);
    expect(parseResultsJson(json)).toEqual([
      {
        value: '6925303773908',
        format: 'EAN_13',
        contentType: 'ARTICLE',
        cornerPoints: [{ x: 1, y: 2 }],
      },
    ]);
  });

  it('未知码制不丢失原文，非法必需字段抛稳定错误', () => {
    expect(parseResultsJson('[{"value":"abc","format":"NEW"}]')).toEqual([
      { value: 'abc', format: 'UNKNOWN' },
    ]);
    expect(() => parseResultsJson('[{"format":"QR_CODE"}]')).toThrow(
      '原生扫码结果不符合约定'
    );
  });
  it.each(['', 'not json', '{"a":1}'])('非法桥接数据 %s 抛错', (json) => {
    expect(() => parseResultsJson(json)).toThrow('原生扫码结果不符合约定');
  });

  it('过滤非法角点', () => {
    const json = JSON.stringify([
      { value: 'x', format: 'QR_CODE', cornerPoints: [{ x: 'no', y: 1 }] },
    ]);
    // 角点全非法 → 不带 cornerPoints 字段
    expect(parseResultsJson(json)).toEqual([{ value: 'x', format: 'QR_CODE' }]);
  });
});
