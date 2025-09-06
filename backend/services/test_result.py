from kokoro import KPipeline

p = KPipeline('en-us', device='cpu')
gen = p('Hello world', voice='af_heart')
r = next(iter(gen))

print('Result attributes:', [attr for attr in dir(r) if not attr.startswith('_')])
print('Has audio:', hasattr(r, 'audio'))

if hasattr(r, 'audio'):
    print('Audio type:', type(r.audio))
    print('Audio shape:', r.audio.shape if hasattr(r.audio, 'shape') else 'No shape')
    print('Audio length:', len(r.audio) if hasattr(r.audio, '__len__') else 'No length')