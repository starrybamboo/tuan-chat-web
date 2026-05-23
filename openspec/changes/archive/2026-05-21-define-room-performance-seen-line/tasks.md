## 1. Seen Line Implementation

- [ ] 1.1 Add a stable DOM marker to the room composer root so the message list can locate the composer top edge.
- [ ] 1.2 Update the chat message list to use the current room composer top edge as the performance seen line, with message scroller bottom as fallback.
- [ ] 1.3 Calculate the seen message index from rendered message bottom bounds instead of Virtuoso render range tail.
- [ ] 1.4 Ensure pending geometry reads are coalesced and cleaned up during component unmount.

## 2. Inline Performance State

- [ ] 2.1 Verify background image state advances only after the background message bottom crosses the seen line.
- [ ] 2.2 Verify background clear state advances only after the clear message bottom crosses the seen line.
- [ ] 2.3 Verify scene effect state advances only after the effect message bottom crosses the seen line.
- [ ] 2.4 Confirm thread reply messages hidden from the main flow do not drive main room inline performance state.

## 3. Tests And Documentation

- [ ] 3.1 Add or update unit tests for seen index selection from message bounds.
- [ ] 3.2 Add or update tests for composer-line fallback behavior.
- [ ] 3.3 Update chat module reference documentation if it describes the old range-tail or scroller-bottom behavior.
- [ ] 3.4 Run the focused Vitest suite for chat frame list and visual effect behavior.
