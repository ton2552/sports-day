FROM python:3.11-slim

WORKDIR /app

COPY . .

# Check if requirements.txt is in root or inside ton/
RUN if [ -f requirements.txt ]; then \
        pip install --no-cache-dir -r requirements.txt; \
    elif [ -f ton/requirements.txt ]; then \
        pip install --no-cache-dir -r ton/requirements.txt && cp -r ton/* .; \
    fi

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "if [ -f main.py ]; then uvicorn main:app --host 0.0.0.0 --port ${PORT}; else cd ton && uvicorn main:app --host 0.0.0.0 --port ${PORT}; fi"]
