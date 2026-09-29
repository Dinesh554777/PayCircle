import os
with open('app/routes/api.py', 'a') as f:
    f.write('\n@api_router.get("/test-error")\ndef test_error():\n    raise ValueError("This is a test error for Sentry")\n')
