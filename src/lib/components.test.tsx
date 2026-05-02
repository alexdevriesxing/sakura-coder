import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../components/CommandPalette';
import { Scratchpad } from '../components/Scratchpad';
import { TerminalOutputPanel } from '../components/TerminalOutputPanel';

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is hidden by default', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/Search commands/)).not.toBeInTheDocument();
  });

  it('shows when Ctrl+K is pressed', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText(/Search commands/)).toBeInTheDocument();
  });
});

describe('Scratchpad', () => {
  it('renders with initial content', () => {
    render(<Scratchpad initialContent="Test content" />);
    expect(screen.getByDisplayValue('Test content')).toBeInTheDocument();
  });

  it('shows word and char count', () => {
    render(<Scratchpad initialContent="Hello world" />);
    expect(screen.getByText('2 words')).toBeInTheDocument();
    expect(screen.getByText('11 chars')).toBeInTheDocument();
  });
});

describe('TerminalOutputPanel', () => {
  const mockOutputs = [
    { id: '1', type: 'info' as const, content: 'Starting...', timestamp: '10:00:00' },
    { id: '2', type: 'success' as const, content: 'Done!', timestamp: '10:00:01' },
    { id: '3', type: 'error' as const, content: 'Failed', timestamp: '10:00:02' },
  ];

  it('renders terminal outputs', () => {
    render(<TerminalOutputPanel outputs={mockOutputs} />);
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('shows error and warning badges', () => {
    render(<TerminalOutputPanel outputs={mockOutputs} />);
    expect(screen.getByText('1 errors')).toBeInTheDocument();
  });

  it('shows empty state when no outputs', () => {
    render(<TerminalOutputPanel outputs={[]} />);
    expect(screen.getByText('No output yet')).toBeInTheDocument();
  });
});