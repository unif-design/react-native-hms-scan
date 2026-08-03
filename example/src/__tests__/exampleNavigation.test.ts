import {
  canGoBack,
  navigationReducer,
  type ExampleRoute,
  type NavigationState,
} from '../navigation/exampleNavigation';

const homeState: NavigationState = {
  stack: [{ name: 'home' }],
};

describe('exampleNavigation', () => {
  it('navigate 将目标页压入首页之上的单层栈', () => {
    const scannerRoute = { name: 'scanner' } satisfies ExampleRoute;

    expect(
      navigationReducer(homeState, {
        type: 'navigate',
        route: scannerRoute,
      })
    ).toEqual({
      stack: [{ name: 'home' }, { name: 'scanner' }],
    });
  });

  it('重复 navigate 只替换 child，不累积第二层或重复 route', () => {
    const scannerState = navigationReducer(homeState, {
      type: 'navigate',
      route: { name: 'scanner' },
    });
    const headlessState = navigationReducer(scannerState, {
      type: 'navigate',
      route: { name: 'headless' },
    });
    const repeatedState = navigationReducer(headlessState, {
      type: 'navigate',
      route: { name: 'headless' },
    });

    expect(headlessState).toEqual({
      stack: [{ name: 'home' }, { name: 'headless' }],
    });
    expect(repeatedState).toEqual({
      stack: [{ name: 'home' }, { name: 'headless' }],
    });
  });

  it.each([
    { name: 'scanner' },
    { name: 'headless' },
    { name: 'decode-image' },
  ] satisfies ExampleRoute[])('back 从 $name 返回首页', (route) => {
    const childState = navigationReducer(homeState, {
      type: 'navigate',
      route,
    });

    expect(navigationReducer(childState, { type: 'back' })).toEqual(homeState);
  });

  it('首页 back 保持原状态并交还系统处理', () => {
    expect(navigationReducer(homeState, { type: 'back' })).toBe(homeState);
    expect(canGoBack(homeState)).toBe(false);
  });

  it('子页允许 Android hardware back 消费事件', () => {
    const childState: NavigationState = {
      stack: [{ name: 'home' }, { name: 'headless' }],
    };

    expect(canGoBack(childState)).toBe(true);
  });
});
