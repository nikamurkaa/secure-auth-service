# Secure Auth Service

Учебный backend-проект по безопасной аутентификации: небольшой микросервис на **Node.js + Express**, в котором реализованы современные механизмы защиты аккаунтов и маршрутов.

Проект показывает, как строить защищённый authentication service:

- регистрация пользователей;
- вход с проверкой пароля;
- хранение паролей через bcrypt hash + salt;
- JWT access tokens с коротким временем жизни;
- ограничение попыток входа: 3 попытки в минуту;
- role-based access control для ролей `user`, `moderator`, `admin`;
- запрет параллельных сессий для одного пользователя;
- экранирование пользовательских данных в ответах API;
- логирование всех попыток входа;
- восстановление пароля через одноразовый reset token.

> Проект является учебным security lab и предназначен для портфолио. Это не production-ready система авторизации.

## Что демонстрирует проект

В проекте реализованы:

- REST API на Express;
- разделение приложения на `app`, `server`, `routes`, `middleware`, `services`, `data`, `utils`;
- `bcryptjs` для безопасного хеширования паролей;
- `jsonwebtoken` для выпуска и проверки JWT;
- `express-rate-limit` для защиты `/auth/login` от перебора паролей;
- middleware для проверки Bearer JWT;
- RBAC middleware для защищённых маршрутов;
- session invalidation: новый вход сбрасывает предыдущий токен пользователя;
- public DTO без `passwordHash`, reset token hash и внутренних session fields;
- единый JSON-формат ошибок;
- OpenAPI-спецификация;
- Postman-коллекция;
- автотесты на встроенном `node:test`;
- GitHub Actions CI.

## Стек технологий

- Node.js
- Express
- JavaScript
- bcryptjs
- JSON Web Token
- express-rate-limit
- Node.js Test Runner
- OpenAPI
- Postman
- GitHub Actions

## Структура проекта

```text
secure-auth-service/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── data/
│   │   └── users.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errors.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── protected.js
│   ├── services/
│   │   └── auth.js
│   └── utils/
│       ├── escape.js
│       ├── password.js
│       └── tokens.js
├── tests/
│   └── auth-api.test.js
├── docs/
│   ├── manual-checks.md
│   ├── openapi.yaml
│   ├── security-model.md
│   └── test-plan.md
├── postman/
│   ├── secure-auth-service.postman_collection.json
│   └── secure-auth-service.local.postman_environment.json
├── .github/workflows/ci.yml
├── .env.example
├── .editorconfig
├── .gitignore
├── LICENSE
├── package.json
└── README.md
```

## Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/kindarufy/secure-auth-service.git
cd secure-auth-service
```

### 2. Установить зависимости

```bash
npm install
```

### 3. Настроить переменные окружения

Можно скопировать пример:

```bash
cp .env.example .env
```

Для локальной учебной проверки приложение может запуститься и без `.env`, но для нормального проекта `JWT_SECRET` обязательно нужно заменить.

### 4. Запустить приложение

```bash
npm start
```

По умолчанию API будет доступно по адресу:

```text
http://localhost:3000
```

## Переменные окружения

Пример переменных находится в файле `.env.example`:

```env
PORT=3000
JWT_SECRET=change-this-secret-in-real-projects
JWT_EXPIRES_IN=15m
LOGIN_RATE_LIMIT_WINDOW_MS=60000
LOGIN_RATE_LIMIT_MAX=3
PASSWORD_RESET_TOKEN_TTL_MS=600000
```

## Demo-аккаунты

| Роль | Username | Password |
|---|---|---|
| Admin | `admin` | `AdminPass123!` |
| Moderator | `moderator` | `ModeratorPass123!` |
| User | `user1` | `UserPass123!` |

## API endpoints

### Health check

```http
GET /health
```

Пример ответа:

```json
{
  "status": "ok",
  "service": "secure-auth-service"
}
```

### Регистрация

```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "username": "new_user",
  "displayName": "New User",
  "email": "new-user@example.com",
  "password": "NewUserPass123!"
}
```

Регистрация всегда создаёт пользователя с ролью `user`. Роль из тела запроса не используется для повышения прав.

Пример ответа не содержит `passwordHash`:

```json
{
  "id": 4,
  "username": "new_user",
  "displayName": "New User",
  "role": "user",
  "lastLogin": null
}
```

### Вход

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "username": "user1",
  "password": "UserPass123!"
}
```

Пример ответа:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": "15m",
  "user": {
    "id": 3,
    "username": "user1",
    "displayName": "Regular User",
    "role": "user",
    "lastLogin": "2026-05-03T12:00:00.000Z"
  }
}
```

### Получить текущего пользователя

```http
GET /auth/me
Authorization: Bearer <accessToken>
```

### Выход

```http
POST /auth/logout
Authorization: Bearer <accessToken>
```

После выхода текущий токен становится недействительным.

### User route

```http
GET /user
Authorization: Bearer <accessToken>
```

Доступно для любой авторизованной роли.

### Moderator route

```http
GET /moderator
Authorization: Bearer <accessToken>
```

Доступно для `moderator` и `admin`.

### Admin route

```http
GET /admin
Authorization: Bearer <accessToken>
```

Доступно только для `admin`.

### Login attempts audit log

```http
GET /auth/login-attempts
Authorization: Bearer <adminAccessToken>
```

Доступно только администратору.

### Запрос reset token

```http
POST /auth/password-reset/request
Content-Type: application/json
```

```json
{
  "username": "user1"
}
```

В учебной версии токен возвращается в ответе как `demoResetToken`, чтобы сценарий можно было проверить без SMS и email.

### Подтверждение сброса пароля

```http
POST /auth/password-reset/confirm
Content-Type: application/json
```

```json
{
  "token": "demo-reset-token",
  "newPassword": "ChangedPass123!"
}
```

Reset token одноразовый. После успешной смены пароля старые активные сессии пользователя сбрасываются.

## Безопасность

Проект демонстрирует защиту нескольких ключевых сценариев.

| Требование | Как реализовано |
|---|---|
| Хеширование паролей | `bcryptjs`, соль создаётся bcrypt автоматически |
| Ограничение входа | `express-rate-limit`: 3 попытки в минуту на `/auth/login` |
| Короткоживущий JWT | `JWT_EXPIRES_IN=15m` по умолчанию |
| Роли | `user`, `moderator`, `admin` |
| Защищённые маршруты | `authenticate`, `requireRole`, `requireAnyRole` |
| Запрет параллельных сессий | при новом login меняется `activeSessionId`, старый JWT отклоняется |
| Экранирование вывода | public DTO проходит через `escapeHtml` |
| Логирование входов | каждый успешный и неуспешный login попадает в audit log |
| Password reset | одноразовый reset token хранится только в виде SHA-256 hash |

Подробнее: [`docs/security-model.md`](docs/security-model.md)

## Ручная проверка

Все команды для ручной проверки находятся в файле:

```text
docs/manual-checks.md
```

Пример входа:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AdminPass123!"}'
```

Пример проверки admin route:

```bash
curl http://localhost:3000/admin \
  -H "Authorization: Bearer <accessToken>"
```

## Автотесты

Запуск тестов:

```bash
npm test
```

Проверка синтаксиса основных файлов:

```bash
npm run check
```

В тестах проверяется:

- доступность `/health`;
- регистрация пользователя;
- отсутствие `passwordHash` в ответах;
- экранирование пользовательского `displayName`;
- запрет повторной регистрации username;
- невозможность входа с неверным паролем;
- блокировка `/auth/login` после 3 неудачных попыток;
- выдача JWT на 15 минут;
- запрет `/admin` для обычного пользователя;
- доступ `/admin` для администратора;
- логирование login attempts;
- запрет параллельных сессий;
- отклонение истёкшего JWT;
- одноразовый reset token для смены пароля.

## OpenAPI

Спецификация API находится в файле:

```text
docs/openapi.yaml
```

Её можно открыть в Swagger Editor или использовать как документацию к API.

## Postman

Postman-коллекция и environment находятся в папке:

```text
postman/
```

Импортируй в Postman:

- `secure-auth-service.postman_collection.json`
- `secure-auth-service.local.postman_environment.json`

## CI

В проекте настроен GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

CI устанавливает зависимости, проверяет синтаксис и запускает автотесты.

## Статус проекта

Проект выполнен как учебная работа по безопасности веб-приложений и оформлен как портфолио-проект. Он показывает понимание базовых принципов безопасной аутентификации, контроля доступа и защиты API.
