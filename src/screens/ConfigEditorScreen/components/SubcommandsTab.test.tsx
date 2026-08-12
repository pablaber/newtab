import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppConfig } from '../../../types/config.ts';
import { mockConfig, mockSubcommands } from '../../../test/fixtures.ts';
import { SubcommandsTab } from './SubcommandsTab.tsx';

const config: AppConfig = { ...mockConfig, subcommands: mockSubcommands };

function renderTab(overrides: Partial<React.ComponentProps<typeof SubcommandsTab>> = {}) {
  const props = {
    config,
    onSave: vi.fn(),
    onClose: vi.fn(),
    onConfigChange: vi.fn(),
    ...overrides,
  };
  render(<SubcommandsTab {...props} />);
  return props;
}

describe('SubcommandsTab', () => {
  it('adds, validates, normalizes, and saves a predefined subcommand', async () => {
    const user = userEvent.setup();
    const { onSave } = renderTab({ config: mockConfig });

    await user.click(screen.getByRole('button', { name: 'Add Subcommand' }));
    const card = document.querySelector('.subcommand-editor-card') as HTMLElement;
    await user.type(within(card).getByLabelText('Subcommand 1 name'), ' Docs ');
    await user.type(within(card).getByLabelText('Subcommand 1 trigger'), ' DOC ');
    await user.click(within(card).getByRole('button', { name: 'Add Item' }));
    await user.type(within(card).getByLabelText(/item 1 label/), ' Guide ');
    await user.type(within(card).getByLabelText(/item 1 URL/), 'example.com/guide');
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.subcommands?.[0]).toEqual({
      name: 'Docs',
      trigger: 'doc',
      items: [{ label: 'Guide', url: 'https://example.com/guide' }],
    });
  });

  it('edits ordered freeform fields and URL templates', async () => {
    const user = userEvent.setup();
    const { onSave } = renderTab({ config: mockConfig });

    await user.click(screen.getByRole('button', { name: 'Add Subcommand' }));
    const card = document.querySelector('.subcommand-editor-card') as HTMLElement;
    await user.type(within(card).getByLabelText('Subcommand 1 name'), 'GitHub');
    await user.type(within(card).getByLabelText('Subcommand 1 trigger'), 'GH');
    await user.click(within(card).getByRole('checkbox', { name: 'Enable freeform URL' }));
    await user.type(within(card).getByLabelText('GitHub field 1 name'), 'Account');
    await user.click(within(card).getByRole('button', { name: 'Add Field' }));
    await user.type(within(card).getByLabelText('GitHub field 2 name'), 'Repo');
    fireEvent.change(within(card).getByPlaceholderText('https://example.com/{field}'), {
      target: { value: 'https://github.com/{account}/{repo}' },
    });
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect((onSave.mock.calls[0][0] as AppConfig).subcommands?.[0].freeform).toEqual({
      fields: [{ name: 'account' }, { name: 'repo' }],
      urlTemplate: 'https://github.com/{account}/{repo}',
    });
  });

  it('reports trigger and template validation errors without saving', async () => {
    const user = userEvent.setup();
    const { onSave } = renderTab({ config: mockConfig });

    await user.click(screen.getByRole('button', { name: 'Add Subcommand' }));
    const card = document.querySelector('.subcommand-editor-card') as HTMLElement;
    await user.type(within(card).getByLabelText('Subcommand 1 name'), 'Broken');
    await user.type(within(card).getByLabelText('Subcommand 1 trigger'), 'not valid');
    await user.click(within(card).getByRole('checkbox', { name: 'Enable freeform URL' }));
    await user.type(within(card).getByLabelText('Broken field 1 name'), 'repo');
    fireEvent.change(within(card).getByPlaceholderText('https://example.com/{field}'), {
      target: { value: 'https://example.com/{unknown}' },
    });
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    expect(screen.getByText('Use letters, numbers, _ or -')).toBeInTheDocument();
    expect(screen.getByText(/Use every field once or more/)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('reorders and removes subcommands and items', async () => {
    const user = userEvent.setup();
    const { onSave } = renderTab();

    const secondCard = document.querySelectorAll('.subcommand-editor-card')[1] as HTMLElement;
    await user.click(within(secondCard).getByTitle('Move subcommand up'));
    expect(screen.getByLabelText('Subcommand 1 name')).toHaveValue('GitHub');

    const projectCard = document.querySelectorAll('.subcommand-editor-card')[1] as HTMLElement;
    await user.click(within(projectCard).getAllByTitle('Remove item')[0]);
    await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

    const saved = onSave.mock.calls[0][0] as AppConfig;
    expect(saved.subcommands?.map((value) => value.trigger)).toEqual(['gh', 'ghp']);
    expect(saved.subcommands?.[1].items).toHaveLength(1);
  });
});
