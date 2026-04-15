<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('middle_name', 50)->nullable();
            $table->string('contact_no', 20)->default('0000000000');
            $table->integer('age')->default(18);
            $table->string('sex', 10)->default('Other');
            $table->text('address')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['middle_name', 'contact_no', 'age', 'sex', 'address']);
        });
    }
};
