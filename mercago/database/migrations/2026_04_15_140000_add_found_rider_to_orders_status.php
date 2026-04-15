<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL requires modifying the enum definition directly
        DB::statement("ALTER TABLE orders MODIFY delivery_status ENUM(
            'finding_rider',
            'found_rider',
            'ongoing',
            'completed',
            'cancelled'
        ) NOT NULL DEFAULT 'finding_rider'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE orders MODIFY delivery_status ENUM(
            'finding_rider',
            'ongoing',
            'completed',
            'cancelled'
        ) NOT NULL DEFAULT 'finding_rider'");
    }
};
