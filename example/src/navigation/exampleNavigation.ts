export type ExampleRoute =
  | { name: 'home' }
  | { name: 'scanner' }
  | { name: 'headless' }
  | { name: 'decode-image' };

export type NavigationState = {
  stack: readonly ExampleRoute[];
};

type NavigationAction =
  | { type: 'navigate'; route: ExampleRoute }
  | { type: 'back' };

export function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'navigate':
      return action.route.name === 'home'
        ? { stack: [action.route] }
        : {
            stack: [{ name: 'home' }, action.route],
          };
    case 'back':
      return canGoBack(state)
        ? { stack: state.stack.slice(0, -1) }
        : state;
  }
}

export function canGoBack(state: NavigationState): boolean {
  return state.stack.length > 1;
}
