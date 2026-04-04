import React from 'react';
import {Text} from 'react-native';
import {render} from '@testing-library/react-native';

function HelloWorld() {
  return <Text>WalletPulse</Text>;
}

describe('App smoke test', () => {
  it('should render a basic component', () => {
    const {getByText} = render(<HelloWorld />);
    expect(getByText('WalletPulse')).toBeTruthy();
  });
});
