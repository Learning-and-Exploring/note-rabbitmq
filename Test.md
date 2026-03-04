# 1) Hit auth endpoint many times (through edge nginx)
for i in {1..25}; do
  echo "---- auth req $i ----"
  curl -s -o /dev/null -D - \
    -H "Content-Type: application/json" \
    -X POST http://localhost:8080/api/auths/login \
    -d '{"email":"nope@example.com","password":"wrong"}' \
  | grep -E "HTTP/|RateLimit-|Retry-After"
done


# 1 line respone
for i in {1..25}; do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/auths/login -H "Content-Type: application/json" -d '{"email":"a","password":"b"}'; done
