<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

/** Return JSON for progressive enhancement, or a fixed local redirect without JavaScript. */
function respond(int $code, string $status, string $message, array $errors = []): never
{
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        $payload = ['ok' => $code >= 200 && $code < 300, 'message' => $message];
        if ($errors !== []) {
            $payload['errors'] = $errors;
        }
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } else {
        $isContact = isset($_POST['form_kind']) && $_POST['form_kind'] === 'contact';
        $destination = $isContact ? '../contact.html' : '../index.html';
        $anchor = $isContact ? 'inquiry' : 'quote';
        header('Location: ' . $destination . '?status=' . rawurlencode($status) . '#' . $anchor, true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'message' => 'Please use the inquiry form to send a request.']);
    exit;
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) {
    respond(413, 'validation-error', 'Your request is too long. Please shorten your message.');
}

function field(string $name): string
{
    return isset($_POST[$name]) && is_string($_POST[$name]) ? trim($_POST[$name]) : '';
}

$kind = field('form_kind') ?: 'quote';
$fields = ['name', 'phone', 'email', 'type', 'datetime', 'passanger', 'pickup', 'dropoff', 'long', 'addTrip', 'add', 'service'];
$data = [];
foreach ($fields as $key) {
    $data[$key] = field($key);
}
$errors = [];

if (!in_array($kind, ['quote', 'contact'], true)) {
    $errors['form_kind'] = 'Please select a valid inquiry form.';
}
if (field('website') !== '') {
    respond(422, 'validation-error', 'We could not process this request. Please email example@gmail.com.');
}
if (strlen($data['name']) < 2 || strlen($data['name']) > 120 || preg_match('/[\r\n]/', $data['name'])) {
    $errors['name'] = 'Enter your full name, using 2 to 120 characters.';
}
if (strlen($data['email']) > 254 || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter a valid email address.';
}
if ($kind === 'quote' || $data['phone'] !== '') {
    $digits = preg_replace('/\D/', '', $data['phone']);
    if (strlen($digits) < 7 || strlen($digits) > 15 || !preg_match('/^[+\d\s().-]+$/', $data['phone'])) {
        $errors['phone'] = 'Enter a valid phone number, including the country code if applicable.';
    }
}
if (field('consent') !== '1') {
    $errors['consent'] = 'Please agree to be contacted about your inquiry.';
}
if (strlen($data['add']) > 5000) {
    $errors['add'] = 'Keep your message within 5,000 characters.';
}
if (strlen($data['service']) > 120) {
    $errors['service'] = 'Select a service or choose General inquiry.';
}

if ($kind === 'contact' && strlen($data['add']) < 10) {
    $errors['add'] = 'Tell us a little about your plans, using at least 10 characters.';
}

if ($kind === 'quote') {
    if (!in_array($data['type'], ['Hourly', 'Round Trip', 'One Way'], true)) {
        $errors['type'] = 'Choose Hourly, Round Trip, or One Way travel.';
    }
    $passengers = filter_var($data['passanger'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000]]);
    if ($passengers === false) {
        $errors['passanger'] = 'Enter a whole number of passengers, from 1 to 1,000.';
    }
    foreach (['pickup', 'dropoff'] as $location) {
        if (strlen($data[$location]) < 3 || strlen($data[$location]) > 300) {
            $errors[$location] = 'Enter a location using 3 to 300 characters.';
        }
    }
    if ($data['long'] !== '' && (!is_numeric($data['long']) || (float) $data['long'] <= 0 || (float) $data['long'] > 168)) {
        $errors['long'] = 'Enter a duration greater than zero and no more than 168 hours, or leave it blank.';
    }
    if (strlen($data['addTrip']) > 500) {
        $errors['addTrip'] = 'Keep additional stops within 500 characters.';
    }
    $zone = new DateTimeZone('America/Chicago');
    $requestedDate = false;
    foreach (['!Y-m-d\TH:i', '!Y-m-d H:i'] as $format) {
        $parsedDate = DateTimeImmutable::createFromFormat($format, $data['datetime'], $zone);
        $dateErrors = DateTimeImmutable::getLastErrors();
        if ($parsedDate !== false && ($dateErrors === false || ($dateErrors['warning_count'] === 0 && $dateErrors['error_count'] === 0))) {
            $requestedDate = $parsedDate;
            break;
        }
    }
    if ($requestedDate === false || $requestedDate <= new DateTimeImmutable('now', $zone)) {
        $errors['datetime'] = 'Choose a future date and time in Austin, Texas (Central Time).';
    }
}

if ($errors !== []) {
    respond(422, 'validation-error', 'Please check the highlighted fields and try again.', $errors);
}

// Credentials belong in the hosting environment and are never returned to the browser.
$smtpHost = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
$smtpPort = (int) (getenv('SMTP_PORT') ?: 587);
$smtpUser = getenv('SMTP_USERNAME') ?: '';
$smtpPassword = getenv('SMTP_PASSWORD') ?: '';
$smtpFrom = getenv('SMTP_FROM') ?: 'example@gmail.com';
if ($smtpUser === '' || $smtpPassword === '' || !filter_var($smtpFrom, FILTER_VALIDATE_EMAIL) || !in_array($smtpPort, [465, 587], true)) {
    respond(503, 'service-unavailable', 'Online inquiries are temporarily unavailable. Please email example@gmail.com with your plans.');
}

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

$labels = ['name' => 'Name', 'email' => 'Email', 'phone' => 'Phone', 'service' => 'Service', 'type' => 'Journey type', 'datetime' => 'Date and time (Austin / Central Time)', 'passanger' => 'Passengers', 'pickup' => 'Pickup location', 'dropoff' => 'Drop-off location', 'long' => 'Duration (hours)', 'addTrip' => 'Additional stops', 'add' => 'Message'];
$included = $kind === 'quote' ? array_keys($labels) : ['name', 'email', 'phone', 'service', 'add'];
$htmlRows = '';
$plainRows = [];
foreach ($included as $key) {
    if ($data[$key] === '') {
        continue;
    }
    $safeValue = nl2br(htmlspecialchars($data[$key], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
    $htmlRows .= '<p><strong>' . $labels[$key] . ':</strong> ' . $safeValue . '</p>';
    $plainRows[] = $labels[$key] . ': ' . $data[$key];
}

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = $smtpHost;
    $mail->Port = $smtpPort;
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUser;
    $mail->Password = $smtpPassword;
    $mail->SMTPSecure = $smtpPort === 465 ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Timeout = 15;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($smtpFrom, 'Luxury');
    $mail->addAddress('example@gmail.com', 'Luxury Concierge');
    $mail->addReplyTo($data['email'], $data['name']);
    $mail->isHTML(true);
    $mail->Subject = $kind === 'quote' ? 'Luxury | New journey request' : 'Luxury | New concierge inquiry';
    $mail->Body = '<h2>Luxury concierge inquiry</h2>' . $htmlRows;
    $mail->AltBody = "Luxury concierge inquiry\n\n" . implode("\n", $plainRows);
    $mail->send();
    respond(200, 'success', 'Thank you. Your inquiry has been sent to the Luxury concierge. We will reply using the contact details you provided.');
} catch (Exception $exception) {
    error_log('Luxury inquiry: SMTP delivery failed. Check the hosting mail configuration.');
    respond(502, 'delivery-error', 'We could not send your inquiry. Please try again or email example@gmail.com.');
}
