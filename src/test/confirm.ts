import { fireEvent, screen, within } from '@testing-library/react'

/**
 * Answers the confirmation popup that replaced the browser's own box. The cancel button comes first and the confirm
 * button last in both skins. Returns the popup so a test can read its question.
 */
export async function answerConfirm(accept: boolean) {
  const popup = await screen.findByRole('alertdialog')
  const buttons = within(popup).getAllByRole('button')
  fireEvent.click(accept ? buttons[buttons.length - 1]! : buttons[0]!)
  return popup
}
