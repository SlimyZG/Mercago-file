<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add rider_id and delivery status to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('rider_id')->nullable()->after('vendor_id');
            // finding_rider → ongoing → completed (or cancelled)
            $table->enum('delivery_status', [
                'finding_rider',
                'ongoing',
                'completed',
                'cancelled',
            ])->default('finding_rider')->after('status');

            $table->foreign('rider_id')->references('id')->on('users')->nullOnDelete();
        });

        // Track which riders declined which orders
        // so we don't re-show the same order to a rider who already declined it
        Schema::create('order_declines', function (Blueprint $table) {
            $table->id();
            $table->uuid('order_id');
            $table->uuid('rider_id');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('rider_id')->references('id')->on('users')->onDelete('cascade');

            $table->unique(['order_id', 'rider_id']); // one decline record per pair
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_declines');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['rider_id']);
            $table->dropColumn(['rider_id', 'delivery_status']);
        });
    }
};
