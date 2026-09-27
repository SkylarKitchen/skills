# Synthesized sound bed from a film's cues (capture.cjs writes <film>.cues.json), nothing to license.
# Ticks on opener cuts rising in pitch, a low thump on the cut into the page, a whoosh into each
# camera move, a click per press, a soft chime on the title, and a quiet pad under everything.
#   python3 sound.py film.cues.json film.wav        (needs numpy)
#   ffmpeg -i film.mp4 -i film.wav -c:v copy -c:a aac -shortest film_sound.mp4
import json, sys, wave
import numpy as np

SR = 48000
cues = json.load(open(sys.argv[1]))
n = int(cues['seconds'] * SR)
L, R = np.zeros(n), np.zeros(n)
rng = np.random.default_rng(7)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i >= n or j <= i: return
    L[i:j] += sig[: j - i] * gain * np.sqrt(0.5 * (1 - pan)); R[i:j] += sig[: j - i] * gain * np.sqrt(0.5 * (1 + pan))

def env(dur, attack, decay):
    t = np.arange(int(dur * SR)) / SR
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay), t

def lowpass(x, fc):  # one-pole, vectorised via lfilter-free cumulative trick is overkill; loop is fine at this length
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); p = 0.0
    for k in range(len(x)): p = (1 - a) * x[k] + a * p; y[k] = p
    return y

def tick(f):
    e, t = env(0.05, 0.0006, 0.012)
    return e * (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.01 * f * t)) * 0.6 + rng.standard_normal(len(t)) * np.exp(-t / 0.002) * 0.12

def chime():
    e, t = env(2.4, 0.004, 0.7)
    return e * (np.sin(2 * np.pi * 880 * t) + 0.6 * np.sin(2 * np.pi * 1318.5 * t) + 0.25 * np.sin(2 * np.pi * 1760 * t) * np.exp(-t / 0.2))

def thump():
    e, t = env(0.45, 0.003, 0.11)
    return e * np.sin(2 * np.pi * np.cumsum(95 * np.exp(-t / 0.08) + 48) / SR)

def click():
    e, t = env(0.03, 0.0003, 0.006)
    return e * (np.sin(2 * np.pi * 3200 * t) * 0.5 + rng.standard_normal(len(t)) * 0.25)

def whoosh(dur=0.6):
    t = np.arange(int(dur * SR)) / SR; u = t / dur
    noise = rng.standard_normal(len(t))
    return np.sin(np.pi * u) ** 2 * (0.4 + 0.6 * u) * (lowpass(noise, 900) * (1 - u) + (noise - lowpass(noise, 3000)) * u * 0.5 + lowpass(noise, 2200) * 0.6)

def pad():  # A-major drone, slow swell, fades at both ends
    t = np.arange(n) / SR
    tone = sum(g * np.sin(2 * np.pi * f * t + ph) for f, g, ph in [(110, 1, 0), (164.8, .6, 1), (220, .5, 2), (277.2, .3, 3)])
    shape = np.minimum(1, t / 1.5) * np.minimum(1, (cues['seconds'] - t) / 2.0) * (0.8 + 0.2 * np.sin(2 * np.pi * t / 7))
    return tone * shape

add(pad(), 0, 0.05)
sw = cues['swaps']
for k, t in enumerate(sw):
    p = k / max(1, len(sw) - 1)
    add(tick(1150 + 900 * p), t, 0.3 + 0.12 * p, pan=0.25 * np.sin(k * 1.7))
if cues.get('page') is not None: add(thump(), cues['page'], 0.55)
for t in cues['whips']: add(whoosh(), t - 0.6, 0.22)
for t in cues['presses']: add(click(), t, 0.35, pan=0.3)
if cues.get('title') is not None: add(thump(), cues['title'], 0.3); add(chime(), cues['title'] + 0.02, 0.22)

m = np.stack([L, R], 1); m *= 0.89 / max(1e-9, np.abs(m).max())
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m * 32767).astype('<i2').tobytes())
print(f"{n / SR:.2f} s, {len(sw)} ticks, {len(cues['whips'])} whooshes, {len(cues['presses'])} clicks")
