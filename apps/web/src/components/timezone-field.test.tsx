import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { TimezoneField } from './timezone-field';

function Harness() {
  const [value, setValue] = useState('Asia/Karachi');
  return (
    <TimezoneField
      value={value}
      options={['Asia/Karachi', 'America/New_York', 'UTC']}
      onChange={setValue}
      onBlur={() => undefined}
    />
  );
}

describe('TimezoneField', () => {
  it('keeps the selected timezone until a listed zone is chosen', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const chosen = screen.getByLabelText('Timezone');
    expect(chosen).toHaveValue('Asia/Karachi');
    expect(chosen).toHaveAttribute('readonly');

    await user.click(screen.getByRole('button', { name: 'Show timezones' }));
    await user.type(screen.getByLabelText('Search timezones'), 'new');

    expect(chosen).toHaveValue('Asia/Karachi');
    expect(screen.getByRole('option', { name: 'America/New_York' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'UTC' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'America/New_York' }));
    expect(chosen).toHaveValue('America/New_York');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
