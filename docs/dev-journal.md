# Development Journal

## Feb 24, 2026
Today I tested the mentor table on my phone after yesterday's production fixes — and it actually works!! The mentors respond in first person which is really cool.

Today I showed it to a few friends and they thought it was funny to talk to "Elon Musk" about homework stress. One of them tried typing in "Naruto" and it actually worked — the Wikipedia lookup found his image and everything.

Today I noticed the search feels kind of clunky though — when you type a name, it takes a while for the photo to show up because it has to hit Wikipedia every time. I want to make it feel more instant.

## Feb 25, 2026
Today I didn't code because school was busy. But I was thinking about the search UX — maybe I should show the verified people (the ones I already have photos for) instantly, and only go to Wikipedia for names I don't recognize.

Today I also realized that some mentor photos randomly break. I think it's a CORS issue with Wikipedia images. Need to look into fallback images.

## Feb 26, 2026
Today I had a math competition prep session after school so no coding.

Today I sketched some ideas in my notebook during lunch — I want the search popup to look more like Bing's search suggestions, with a photo on the left and the name + description on the right.

## Feb 27, 2026
Today I tried using the website more as a real user instead of just testing. The chat bubbles feel off — my messages and the mentor's messages look too similar.

Today I compared it to iMessage and WeChat. They both use left/right alignment + different colors to show who's talking. I want to do the same thing.

Today I also noticed the mentor names don't show in Chinese when I switch to Chinese mode. That's a bug — I have the Chinese names in the code but they're not connected properly.

## Feb 28, 2026
Today I spent some time looking at how other websites handle image loading errors — apparently you're supposed to chain multiple fallback URLs so if one breaks, it tries the next one.

Today I also read about CORS and why Wikipedia images sometimes get blocked. My dad said I might need to proxy the images or just rely on the ones I already saved in the verified list.

Today I made a rough plan for what to fix — search speed, chat alignment, and image reliability are the top 3.

## Mar 1, 2026
Today I talked to my dad about the image problem. He suggested I should look up the image at render time from my verified list instead of relying on what the API returns. That way even if the API gives a bad URL, I always have a good one.

Today I also realized the favicon files are duplicated in three different folders — public/, public/assets/icons/, and public/assets/images/. They're all the same file. I should clean that up.

## Mar 2, 2026
Today I was busy with school but I tested the website on Safari during a break. Some images that work on Chrome are completely broken on Safari. Added that to my fix list.

Today I also noticed that the Cypress test video got committed to git by accident — that's an 800KB binary file that shouldn't be tracked. Need to add cypress/videos/ to .gitignore.

## Mar 3, 2026
Today I didn't code. Busy with school.

Today I had an idea during class (oops) — what if the search shows matching results from my verified people list INSTANTLY without waiting for Wikipedia? Then Wikipedia results can load in the background and get added to the dropdown.

## Mar 4, 2026
Today I made a full list of all the UX things I want to fix:
1. Instant autocomplete from verified people list
2. Better chat bubble alignment (left vs right)
3. Bing-style search popup with photos
4. Fix image CORS issues with render-time lookup
5. Better fallback chain when photos don't load

Today I also looked at the MentorTablePage code and realized it's almost 2000 lines with 40 useState hooks. That's way too big for one component. I should break it apart eventually, but the UX fixes come first.

## Mar 5, 2026
Today I started planning which files I need to change for each fix. The image lookup fix should go in personLookup.ts (the source of truth), not in the UI component.

Today I also found a bug in ConfessionPage — there's a hardcoded "User123" as the user ID. If two people post non-anonymously, they'd share the same identity. That's a privacy issue.

Today I realized the API error response leaks which environment variables are configured. That's a security issue — an attacker could see exactly which secrets are set up. Should log that server-side only.

## Mar 6, 2026
Today I didn't code but I reviewed the mentor API code. There are three different language detection functions — one in the frontend, two in the backend — all with slightly different thresholds. They're going to give inconsistent results. Should consolidate them.

Today I also noticed there's a dead function called getOutputLanguage that always returns the UI language no matter what text you pass in. It ignores its input completely. Should just use uiLanguage directly.

## Mar 7, 2026
Today I hung out with friends instead of coding. That's ok, I have a clear plan for what to fix.

Today I explained the website to a friend and they asked why the mentor names show in English even when the UI is in Chinese. I told them it's because the Chinese name map in the component is separate from the verified people data — they'll drift out of sync. Need to consolidate.

## Mar 8, 2026
Today I tested different scenarios on the mentor table — trying weird names, empty searches, really long problem descriptions. Found that the search sometimes returns places and objects instead of people. The filtering could be stricter.

Today I also checked the database service code. The view counter has a race condition — it reads the count, adds 1, then writes back. Two people viewing at the same time would lose a count. Should use an atomic operation.

## Mar 9, 2026
Today I was at school. No coding but I prioritized my fix list during lunch. The security fixes (hardcoded user ID, API info leak) should come before the UX polish.

Today I also thought about the dead code in database.service.ts — there's a generateTestAccessCode function that nobody calls, and it uses Math.random() which is weaker than the crypto.getRandomValues() used by the real one. Should just delete it.

## Mar 10, 2026
Today I had debate practice after school so no coding.

Today I mapped out the order I'll do the fixes: security first (User123, API leak), then cleanup (dead code, duplicates), then UX (search, images, alignment).

## Mar 11, 2026
Today I almost started coding but realized I should think about the search approach more carefully first. My dad always says "measure twice, cut once."

Today I decided the image fix strategy: at render time, always look up the person in VERIFIED_PEOPLE to get the canonical photo URL, even if the person was originally added with a different URL. This way the verified list is always the source of truth.

Today I also planned how to replace the mentorNameZhMap — I can add a getChineseDisplayName() function to personLookup.ts that extracts the Chinese alias from the verified people data. One source of truth instead of two.

## Mar 12, 2026
Today I did a final review of my fix list and prioritized everything. Tomorrow I'm going to start coding — instant autocomplete and chat bubble alignment first, those will make the biggest difference.

Today I also tested the production site one more time to make sure it's still working after the Feb 23 deploy. Everything looks good, just needs the UX polish.

Today I feel ready to dive back in. The break was good — I have a much clearer picture of what needs to change and why, compared to just jumping in and fixing things randomly.
