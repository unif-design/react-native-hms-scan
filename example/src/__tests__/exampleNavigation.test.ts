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
