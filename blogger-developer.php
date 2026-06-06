<?php
function send_email($to, $subject, $message) {
    $log = "[" . date('Y-m-d H:i:s') . "] To: $to | Subject: $subject | Message: $message\n";
    file_put_contents(__DIR__ . '/../logs/email.log', $log, FILE_APPEND);
    return true;
}
