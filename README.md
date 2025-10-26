# Gorur Tengri

A survival horror game originally built with Rust and Bevy, but now built with. Heavily inspired by Mongolian and Turkic folklore. Title is partly Anglicized Tatar and roughly translates to "Prideful God". Full disclosure, I don't speak Tatar so I got that title by typing stuff into Google Translate. I have quite literally no idea if that's grammatically correct.

Not putting a license on this so I can retain full copyright while I figure out what, if any business model I would distribute it under. I'm mostly just doing this to have a rust project that I can put on my resume.

## AI Usage

So far, I haven't used AI for writing much of the gameplay code, mainly because I want to keep my coding skills up, but also because AI is really bad at that kind of procedure heavy coding and kinda just gets in the way.

However, I have used AI intermittently for writing UI code. Entering the web development sphere from a game dev background, I've found that web dev is incredibly front loaded with memorization. As I'm writing this rant, I just had GPT 4.1 help me fix a problem where the pause screen wouldn't show up. It suggested that the z index could be causing the problem, but changing the z index of my version of the component didn't fix the issue. I decided to just copy paste GPT 4.1's version of the component wholesale, at which point, the pause screen finally showed up. I still don't know what exactly made everything work because nothing in the AI's version of the component really stands out, but I'm not really excited about futzing around with it for 10-10,000 minutes to figure out where I went wrong.

Like, for goodness sakes man game dev might be hard, but if a brand new programmer wanted to make a basic 2d video game, I would:
1. Have them go through the official Go lang tutorials
2. Guide them through making an absolutely basic animation loop with SFML and point them to the SFML docs
3. Guide them through accepting input
4. Guide them through making a camera object with SFML views

And then they're off to the races. MAYBE I'd have to explain collision detection, but they'd probably figure that out on their own if they're clever and/or driven. MAYBE I'd also have to link them to a 2d physics engine if they were adamant about making a physics heavy game.

I'm telling you man, I've taught two week game dev classes to middle/highschoolers. Games might be complicated, but from that starting point you can really make like, 99% of the 2d games on steam. A driven newbie programmer can really figure out paradigms like OOP, ECS, and FP through experience, and then do really complicated stuff like animation and behavior trees after reading online tutorials.

By contrast, learning web dev feels a lot like learning Mandarin in the sense that a beginner is smacked in the face with tons of complexity and memorization. The learning process seems to be:

1. Read 10,000 articles on MDN
2. Memorize 1,000,000 symbols
3. Memorize a confusing web of terms like "flexbox"
4. Read 2,500,000 pages of the Daoist cannon
5. Climb to the highest point of San Francisco on your knees while reciting the 77 koans of Linus Torvalds

I'm exaggerating, but only a little bit.

I've had to use AI to help me debug a few problems every now and then. Three.js, Jolt.js, and a few other libraries have the misfortune of having some resources be garbage collected and some require manual deposal, i.e. storage buffers must be manually freed, but attributes are garbage collected. I haven't figured out a rhyme or reason for this distinction quite yet, so I still ask chatgpt which ones need disposal

Add the Twitter Driven Development mindset most web devs have where they're constantly changing the "recommended" stack, and it's no wonder why newbies get so discouraged (well, that and the job market).

"Have you seen the new Javascript framework? It's a fork of Tubu. It's literally a dialect of Heebee. It's hosted on Poodee with ads. It a dependency of Dippy. You can probably pull it from Weeno. Dude it's the successor of Gumpy. It's a Pheebo original. It's hosted on Poob. You can host it on Poob. You can go to Poob and host it. Log onto Poob right now. Go to Poob. Dive into Poob. You can Poob it. It's hosted on Poob. Poob has it for you. Poob has it for you.

WHAT? YOU'RE STILL USING GLUBUS? YOU'VE LITERALLY KILLED YOUR OWN PRODUCTIVITY AND OBAMA. TO THE STREETS WITH YOU APOSTATE. TO THE STREETS WHERE THERE IS MUCH WEEPING AND GNASHING OF TEETH."

idk this rant is going too long