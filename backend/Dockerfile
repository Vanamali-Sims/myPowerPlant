# Pinned to arm64 (Graviton2): cheaper per GB-second, and asyncpg plus every
# other dependency here is already confirmed to install from real manylinux
# aarch64 wheels. Must match the deployed Lambda function's Architectures
# setting.
#
# To switch, use `docker build --build-arg PLATFORM=linux/amd64` — do not use
# `docker build --platform=...` on its own to try to change this. That flag
# only relabels the exported image's declared platform; it does not change
# which base image this FROM line actually pulls, so the two can silently
# disagree (an image whose manifest claims amd64 while its real content is
# still arm64 machine code). If you do pass --platform on the build command,
# pass the matching --build-arg too so they can't drift apart.
ARG PLATFORM=linux/arm64
FROM --platform=${PLATFORM} public.ecr.aws/lambda/python:3.13

COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

COPY app ${LAMBDA_TASK_ROOT}/app
COPY alembic ${LAMBDA_TASK_ROOT}/alembic
COPY alembic.ini ${LAMBDA_TASK_ROOT}/

CMD ["app.main.handler"]
