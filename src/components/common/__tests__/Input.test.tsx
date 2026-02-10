
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input', () => {
  it('should render input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should render label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should associate label with input', () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input.tagName).toBe('INPUT');
  });

  it('should show required indicator', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should handle value changes', () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('should display error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should set aria-invalid when error is present', () => {
    render(<Input error="Required" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('should set aria-describedby for error', () => {
    render(<Input id="test-input" error="Required" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
  });

  it('should show error role alert', () => {
    render(<Input error="Required" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should display helper text', () => {
    render(<Input helperText="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('should hide helper text when error is shown', () => {
    render(<Input helperText="Help" error="Error" />);
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should be disabled', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should support placeholder', () => {
    render(<Input placeholder="Enter value" />);
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  it('should support custom id', () => {
    render(<Input id="custom-id" label="Custom" />);
    const input = screen.getByLabelText('Custom');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('should render left addon', () => {
    render(<Input leftAddon={<span data-testid="left-addon">$</span>} />);
    expect(screen.getByTestId('left-addon')).toBeInTheDocument();
  });

  it('should render right addon', () => {
    render(<Input rightAddon={<span data-testid="right-addon">@</span>} />);
    expect(screen.getByTestId('right-addon')).toBeInTheDocument();
  });

  it('should hide label visually when hideLabel is true', () => {
    render(<Input label="Hidden Label" hideLabel />);
    const label = screen.getByText('Hidden Label');
    expect(label.className).toContain('sr-only');
  });

  it('should forward ref', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });
});
