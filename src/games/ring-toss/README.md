# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim, and click to toss a ring at the circle.
- A ring lands up to 12 pixels from where you aimed, so steady aim matters.
- You have 8 rings. The round ends when you are out of rings and the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 pixels of a bottle's neck. There are three
rows of five bottles, and bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`,
  `ringPosition`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
