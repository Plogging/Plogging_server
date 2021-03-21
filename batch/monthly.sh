#!/bin/bash

echo $(date '+%Y/%m/%d %H:%M:%S') $(docker exec -it dockercompose_plogging-redis_1 sh -c 'echo "auth dkwmfrjdns1!\nmulti\ndel score_monthly\ndel distance_monthly\ndel trash_monthly\nexec" | redis-cli' | tr '\r\n' ' ') >> ~/flush_weekly.log 2>&1
