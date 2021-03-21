#!/bin/bash

echo $(date '+%Y/%m/%d %H:%M:%S') $(docker exec -it dockercompose_plogging-redis_1 sh -c 'echo "auth dkwmfrjdns1!\nmulti\ndel score_weekly\ndel distance_weekly\ndel trash_weekly\nexec" | redis-cli' | tr '\r\n' ' ') >> ~/flush_weekly.log 2>&1
