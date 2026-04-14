## App
### Constructs
* Recreate the vibe of logging workouts in notebooks. 
* Workouts will be logged in plain text.
* A workout consists of one to many exercises.
* Exercises consist of one to many sets.
* Exercises have metadata like name, muscle group, and equipment used.
* Exercises will be hardcoded to start.
* Equipment can be a barbell or a dumbbell. 
* A set has a weight and number of repetitions.
* Weight is in lbs.

### Workflows
* User will create a new workout.
* They can select an exercise for their workout.
* Under the exercise they will input the number of sets
* Sets look like 135x8
* After a user works out, they will be able to click an export to strava button.

### Input Experience
It will look like a plain text input to start.
However, the input validation will be very strict to follow the example workout.
Users will be primarily input through options that appear.

Opening the cursor on a fresh workout will suggest different exercises.
A cursor one line below an exercise name or a set name will allow users to input the weight or number of reps.
It should autofill the x.
Two newlines should open the exercise selection again.
Exercises cannot be repeated so only show exercises that have not been entered.

### Example Workout

Bench
135x8
225x5
275x2
315x2
275x6
225x14

Incline Bench
135x5
185x8
185x8

## Architecture
* Pure frontend application powered by React and vite .
* TypeScript / pnpm
* Tailwind css
* Biome formatting and linting validation
* Playwright testing

## Verification
* `pnpm dev` — start dev server, confirm page renders with no console errors
* `pnpm build` — production build must succeed
* `pnpm lint` — Biome check must pass
* `pnpm test` — Playwright smoke tests must pass
