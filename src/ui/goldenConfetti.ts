import confetti from 'canvas-confetti';

const GOLD = ['#ffd86b', '#ffe6a3', '#ff9a3c', '#ffffff'];

/**
 * Fires the X-Factor golden-buzzer celebration: a wide gold burst
 * from the lower half of the screen, followed ~350 ms later by a
 * smaller star-shaped shower from above. Designed to feel distinctly
 * bigger than the routine champion confetti (rendered by the CSS
 * `<Confetti />` component) so the Golden Buzzer moment lands as a
 * one-off, special event.
 */
export async function fireGoldenConfetti(): Promise<void> {
  confetti({
    particleCount: 250,
    spread: 160,
    origin: { y: 0.7 },
    colors: GOLD,
    startVelocity: 55,
    ticks: 200,
    scalar: 1.1,
  });
  await new Promise((r) => setTimeout(r, 350));
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { y: 0.25 },
    colors: GOLD,
    shapes: ['star'],
    gravity: 0.6,
    ticks: 250,
  });
}
