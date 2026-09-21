FROM python:3.12-slim-bookworm

WORKDIR /app

COPY ["Resume Parser/Resume Parser/requirements.txt", "/tmp/requirements.txt"]
RUN pip install --no-cache-dir -r /tmp/requirements.txt gunicorn

COPY . /app

EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "8", "--timeout", "180", "--chdir", "/app/Resume Parser/Resume Parser", "server:app"]
