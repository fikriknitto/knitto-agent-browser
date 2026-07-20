import { describe, expect, it } from 'vitest';
import { render, renderHook } from 'vitest-browser-react';
import { act } from 'react';
import { useState } from 'react';
import { Typography } from '@knittotextile/react-ui';
import { Button } from '@knittotextile/react-ui';

function StateComponentTest() {
  const [count, setCount] = useState<number>(0);
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Typography as="h3">{count}</Typography>
      <div className="flex gap-2">
        <Button onClick={() => setCount(count + 1)}>Increment</Button>
        <Button onClick={() => setCount(count - 1)}>Decrement</Button>
      </div>
    </div>
  );
}

describe('State Hook Test', () => {
  it('seharusnya menampilkan nilai awal 0', async () => {
    const { result } = await renderHook(() => useState(0));
    expect(result.current[0]).toBe(0);
  });

  it('seharusnya menampilkan nilai increment 1', async () => {
    const { result } = await renderHook(() => {
      const [count, setCount] = useState(0);
      return {
        count,
        increment: () => setCount((c) => c + 1),
      };
    });
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('seharusnya menampilkan nilai decrement 1', async () => {
    const { result } = await renderHook(() => {
      const [count, setCount] = useState(0);
      return {
        count,
        decrement: () => setCount((c) => c - 1),
      };
    });
    act(() => result.current.decrement());
    expect(result.current.count).toBe(-1);
  });

  it('seharusnya menampilkan nilai increment 1 dan decrement 1', async () => {
    const { result } = await renderHook(() => {
      const [count, setCount] = useState(0);
      return {
        count,
        increment: () => setCount((c) => c + 1),
        decrement: () => setCount((c) => c - 1),
      };
    });

    expect(result.current.count).toBe(0);

    act(() => result.current.increment());
    expect(result.current.count).toBe(1);

    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });
});

describe('State Component Test', () => {
  it('seharusnya menampilkan nilai awal = 0', async () => {
    const screen = await render(<StateComponentTest />);

    await expect.element(screen.getByRole('heading', { level: 3 })).toHaveTextContent('0');
    await expect.element(screen.getByRole('button', { name: 'Increment' })).toBeInTheDocument();
    await expect.element(screen.getByRole('button', { name: 'Decrement' })).toBeInTheDocument();
  });

  it('seharusnya menambahkan nilai ketika button increment diklik', async () => {
    const screen = await render(<StateComponentTest />);
    const incrementButton = screen.getByRole('button', { name: 'Increment' });

    await incrementButton.click();
    await expect.element(screen.getByRole('heading', { level: 3 })).toHaveTextContent('1');
    await incrementButton.click();
    await expect.element(screen.getByRole('heading', { level: 3 })).toHaveTextContent('2');
  });

  it('seharusnya mengurangi nilai ketika button decrement diklik', async () => {
    const screen = await render(<StateComponentTest />);
    const incrementButton = screen.getByRole('button', { name: 'Increment' });
    const decrementButton = screen.getByRole('button', { name: 'Decrement' });

    await incrementButton.click();
    await decrementButton.click();
    await expect.element(screen.getByRole('heading', { level: 3 })).toHaveTextContent('0');
  });
});
